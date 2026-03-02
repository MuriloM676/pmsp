// src/controllers/viaturasController.js
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

// ============================================================
//  VIATURAS
// ============================================================

/**
 * GET /api/v1/viaturas
 */
const listar = async (req, res) => {
  const { status, tipo, id_unidade, busca, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const filtros = [];

  const { perfil, id_unidade: unidadeUsuario } = req.usuario;
  if (!['Gestor', 'Comandante', 'Administrador'].includes(perfil)) {
    filtros.push(`v.id_unidade = $${params.push(unidadeUsuario)}`);
  } else if (id_unidade) {
    filtros.push(`v.id_unidade = $${params.push(id_unidade)}`);
  }

  if (status) filtros.push(`v.status = $${params.push(status)}`);
  if (tipo)   filtros.push(`v.tipo = $${params.push(tipo)}`);
  if (busca)  filtros.push(`(v.prefixo ILIKE $${params.push('%'+busca+'%')} OR v.placa ILIKE $${params.push('%'+busca+'%')})`);

  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  try {
    const { rows: viaturas } = await query(
      `SELECT
         v.id, v.prefixo, v.placa, v.tipo, v.marca, v.modelo,
         v.ano_fabricacao, v.cor, v.status, v.km_atual,
         v.ultima_revisao, v.proxima_revisao,
         u.codigo AS unidade_codigo,
         -- Ocorrência ativa atual
         oc.numero_bo AS ocorrencia_ativa,
         oc.natureza  AS ocorrencia_natureza,
         -- Última posição GPS
         (SELECT ST_Y(localizacao::geometry) FROM rastreamento_viaturas
          WHERE id_viatura = v.id ORDER BY registrado_em DESC LIMIT 1) AS lat,
         (SELECT ST_X(localizacao::geometry) FROM rastreamento_viaturas
          WHERE id_viatura = v.id ORDER BY registrado_em DESC LIMIT 1) AS lng,
         -- Revisão vencida?
         (v.proxima_revisao < CURRENT_DATE) AS revisao_vencida
       FROM viaturas v
       JOIN unidades u ON u.id = v.id_unidade
       LEFT JOIN ocorrencias oc ON oc.id_viatura = v.id
         AND oc.status IN ('Despachada', 'Em Atendimento')
       ${where}
       ORDER BY v.prefixo
       LIMIT $${params.push(parseInt(limit))} OFFSET $${params.push(offset)}`,
      params
    );

    // Sumário de frota
    const { rows: sumario } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='Disponível')     AS disponiveis,
         COUNT(*) FILTER (WHERE status='Em Patrulha')    AS em_patrulha,
         COUNT(*) FILTER (WHERE status='Em Ocorrência')  AS em_ocorrencia,
         COUNT(*) FILTER (WHERE status='Manutenção')     AS manutencao,
         COUNT(*) TOTAL
       FROM viaturas v
       ${where.replace('WHERE', 'WHERE').split('LIMIT')[0]}`,
      params.slice(0, params.length - 2)
    );

    res.json({
      dados: viaturas,
      sumario: sumario[0],
      paginacao: {
        pagina: parseInt(page),
        limite: parseInt(limit),
      },
    });
  } catch (err) {
    logger.error('Erro ao listar viaturas', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar viaturas' });
  }
};

/**
 * GET /api/v1/viaturas/:id
 */
const buscarPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const [{ rows: v }, { rows: manut }, { rows: ocorrencias }] = await Promise.all([
      query(
        `SELECT v.*, u.codigo AS unidade_codigo, u.nome AS unidade_nome
         FROM viaturas v JOIN unidades u ON u.id = v.id_unidade
         WHERE v.id = $1`,
        [id]
      ),
      query(
        `SELECT tipo, descricao, data_entrada, data_saida, custo, resolvido
         FROM manutencoes
         WHERE id_viatura = $1
         ORDER BY data_entrada DESC LIMIT 10`,
        [id]
      ),
      query(
        `SELECT numero_bo, natureza, status, data_hora_fato
         FROM ocorrencias
         WHERE id_viatura = $1
         ORDER BY data_hora_fato DESC LIMIT 10`,
        [id]
      ),
    ]);

    if (!v[0]) return res.status(404).json({ erro: 'Viatura não encontrada' });

    res.json({ ...v[0], manutencoes: manut, historico_ocorrencias: ocorrencias });
  } catch (err) {
    logger.error('Erro ao buscar viatura', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar viatura' });
  }
};

/**
 * POST /api/v1/viaturas
 */
const criar = async (req, res) => {
  const {
    prefixo, placa, tipo, marca, modelo, ano_fabricacao,
    cor, id_unidade, km_atual, ultima_revisao, proxima_revisao,
  } = req.body;

  try {
    const { rows: existe } = await query(
      'SELECT id FROM viaturas WHERE prefixo=$1 OR placa=$2',
      [prefixo, placa]
    );
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'Prefixo ou placa já cadastrado' });
    }

    const { rows } = await query(
      `INSERT INTO viaturas (
         prefixo, placa, tipo, marca, modelo, ano_fabricacao,
         cor, id_unidade, km_atual, ultima_revisao, proxima_revisao
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, prefixo, placa`,
      [
        prefixo, placa, tipo, marca, modelo, ano_fabricacao,
        cor, id_unidade || req.usuario.id_unidade,
        km_atual || 0, ultima_revisao || null, proxima_revisao || null,
      ]
    );

    logger.info('Viatura cadastrada', { prefixo, usuario: req.usuario.login });
    res.status(201).json({ mensagem: 'Viatura cadastrada com sucesso', dados: rows[0] });
  } catch (err) {
    logger.error('Erro ao criar viatura', { error: err.message });
    res.status(500).json({ erro: 'Erro ao cadastrar viatura' });
  }
};

/**
 * PATCH /api/v1/viaturas/:id/status
 */
const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status, km_atual, observacoes } = req.body;

  const statusValidos = ['Disponível', 'Em Patrulha', 'Em Ocorrência', 'Manutenção', 'Sinistro', 'Desativada'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido', valores: statusValidos });
  }

  try {
    const { rowCount } = await query(
      `UPDATE viaturas SET
         status        = $1,
         km_atual      = COALESCE($2, km_atual),
         observacoes   = COALESCE($3, observacoes),
         atualizado_em = NOW()
       WHERE id = $4`,
      [status, km_atual || null, observacoes || null, id]
    );

    if (rowCount === 0) return res.status(404).json({ erro: 'Viatura não encontrada' });

    logger.info('Status de viatura atualizado', { id, status, usuario: req.usuario.login });
    res.json({ mensagem: `Status atualizado para ${status}` });
  } catch (err) {
    logger.error('Erro ao atualizar status de viatura', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao atualizar viatura' });
  }
};

/**
 * POST /api/v1/viaturas/:id/rastreamento
 * Recebe posição GPS da viatura (enviado pelo dispositivo na viatura)
 */
const registrarPosicao = async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, velocidade, direcao } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ erro: 'latitude e longitude obrigatórios' });
  }

  try {
    await query(
      `INSERT INTO rastreamento_viaturas (id_viatura, localizacao, velocidade, direcao)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2,$3),4326), $4, $5)`,
      [id, longitude, latitude, velocidade || null, direcao || null]
    );
    res.status(204).send();
  } catch (err) {
    logger.error('Erro ao registrar posição', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao registrar posição' });
  }
};

// ============================================================
//  MANUTENÇÕES
// ============================================================

/**
 * POST /api/v1/manutencoes
 */
const criarManutencao = async (req, res) => {
  const {
    id_viatura, tipo, descricao, km_entrada,
    data_entrada, data_prevista, fornecedor, nota_fiscal,
  } = req.body;

  if (!id_viatura || !tipo || !descricao || !data_entrada) {
    return res.status(400).json({ erro: 'Campos obrigatórios: id_viatura, tipo, descricao, data_entrada' });
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO manutencoes (
           id_viatura, tipo, descricao, km_entrada,
           data_entrada, data_prevista, fornecedor, nota_fiscal, criado_por
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id_viatura, tipo, descricao, km_entrada || null,
          data_entrada, data_prevista || null, fornecedor || null,
          nota_fiscal || null, req.usuario.id,
        ]
      );

      // Muda status da viatura para Manutenção
      await client.query(
        `UPDATE viaturas SET status='Manutenção', atualizado_em=NOW() WHERE id=$1`,
        [id_viatura]
      );
    });

    logger.info('Manutenção registrada', { id_viatura, tipo, usuario: req.usuario.login });
    res.status(201).json({ mensagem: 'Manutenção registrada com sucesso' });
  } catch (err) {
    logger.error('Erro ao criar manutenção', { error: err.message });
    res.status(500).json({ erro: 'Erro ao registrar manutenção' });
  }
};

/**
 * PATCH /api/v1/manutencoes/:id/concluir
 */
const concluirManutencao = async (req, res) => {
  const { id } = req.params;
  const { custo, km_saida, data_saida } = req.body;

  try {
    await transaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE manutencoes SET
           resolvido  = TRUE,
           data_saida = COALESCE($1, CURRENT_DATE),
           custo      = $2
         WHERE id = $3
         RETURNING id_viatura`,
        [data_saida, custo || null, id]
      );

      if (!rows[0]) return res.status(404).json({ erro: 'Manutenção não encontrada' });

      // Atualiza viatura: km e status
      await client.query(
        `UPDATE viaturas SET
           status        = 'Disponível',
           km_atual      = COALESCE($1, km_atual),
           ultima_revisao = CURRENT_DATE,
           atualizado_em  = NOW()
         WHERE id = $2`,
        [km_saida || null, rows[0].id_viatura]
      );
    });

    res.json({ mensagem: 'Manutenção concluída. Viatura liberada.' });
  } catch (err) {
    logger.error('Erro ao concluir manutenção', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao concluir manutenção' });
  }
};

module.exports = {
  listar, buscarPorId, criar, atualizarStatus,
  registrarPosicao, criarManutencao, concluirManutencao,
};
