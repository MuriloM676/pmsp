// src/controllers/policiaisController.js
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

// ============================================================
//  POLICIAIS
// ============================================================

/**
 * GET /api/v1/policiais
 */
const listar = async (req, res) => {
  const {
    situacao, posto_graduacao, id_unidade,
    busca, page = 1, limit = 30,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const filtros = [];

  if (situacao)         filtros.push(`p.situacao = $${params.push(situacao)}`);
  if (posto_graduacao)  filtros.push(`p.posto_graduacao = $${params.push(posto_graduacao)}`);
  if (id_unidade)       filtros.push(`p.id_unidade = $${params.push(id_unidade)}`);
  if (busca) {
    filtros.push(`(p.nome_completo ILIKE $${params.push('%' + busca + '%')}
                OR p.nome_guerra   ILIKE $${params.push('%' + busca + '%')}
                OR p.rg_pm         ILIKE $${params.push('%' + busca + '%')})`);
  }

  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  try {
    const { rows: policiais } = await query(
      `SELECT
         p.id, p.rg_pm, p.nome_guerra, p.nome_completo, p.sexo,
         p.posto_graduacao, p.situacao, p.foto_url,
         p.email_corporativo, p.telefone_funcional,
         u.codigo AS unidade_codigo, u.nome AS unidade_nome
       FROM policiais p
       JOIN unidades u ON u.id = p.id_unidade
       ${where}
       ORDER BY
         ARRAY_POSITION(ARRAY[
           'Coronel','Tenente Coronel','Major','Capitão',
           'Primeiro Tenente','Segundo Tenente','Aspirante a Oficial',
           'Subtenente','Primeiro Sargento','Segundo Sargento',
           'Terceiro Sargento','Cabo','Soldado'
         ]::text[], p.posto_graduacao::text),
         p.nome_guerra
       LIMIT $${params.push(parseInt(limit))} OFFSET $${params.push(offset)}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const { rows: cnt } = await query(
      `SELECT COUNT(*) AS total FROM policiais p ${where}`,
      countParams
    );

    res.json({
      dados: policiais,
      paginacao: {
        total: parseInt(cnt[0].total),
        pagina: parseInt(page),
        limite: parseInt(limit),
        paginas: Math.ceil(cnt[0].total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Erro ao listar policiais', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar policiais' });
  }
};

/**
 * GET /api/v1/policiais/efetivo-hoje
 * Policiais em serviço no turno atual
 */
const efeitoHoje = async (req, res) => {
  try {
    const horaAtual = new Date().getHours();
    let turnoAtual;
    if (horaAtual >= 6 && horaAtual < 14)       turnoAtual = 'Manhã';
    else if (horaAtual >= 14 && horaAtual < 22) turnoAtual = 'Tarde';
    else                                         turnoAtual = 'Noite';

    const { rows: efetivo } = await query(
      `SELECT
         p.rg_pm, p.nome_guerra, p.posto_graduacao, p.foto_url,
         e.turno, e.hora_entrada, e.hora_saida, e.funcao,
         u.codigo AS unidade_codigo,
         -- verifica se está em alguma ocorrência ativa
         EXISTS (
           SELECT 1 FROM ocorrencia_policiais op
           JOIN ocorrencias o ON o.id = op.id_ocorrencia
           WHERE op.id_policial = p.id
             AND o.status IN ('Despachada','Em Atendimento')
         ) AS em_ocorrencia
       FROM escalas e
       JOIN policiais p ON p.id = e.id_policial
       JOIN unidades u ON u.id = e.id_unidade
       WHERE e.data_servico = CURRENT_DATE
         AND p.situacao = 'Ativo'
       ORDER BY e.turno, p.posto_graduacao`,
      []
    );

    // Agrupado por turno
    const porTurno = efetivo.reduce((acc, pm) => {
      if (!acc[pm.turno]) acc[pm.turno] = [];
      acc[pm.turno].push(pm);
      return acc;
    }, {});

    res.json({
      turno_atual: turnoAtual,
      total: efetivo.length,
      em_ocorrencia: efetivo.filter(p => p.em_ocorrencia).length,
      por_turno: porTurno,
    });
  } catch (err) {
    logger.error('Erro ao buscar efetivo do dia', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar efetivo' });
  }
};

/**
 * GET /api/v1/policiais/:id
 */
const buscarPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const [{ rows: pm }, { rows: escalasRecentes }, { rows: licencas }] = await Promise.all([
      query(
        `SELECT p.*, u.codigo AS unidade_codigo, u.nome AS unidade_nome
         FROM policiais p
         JOIN unidades u ON u.id = p.id_unidade
         WHERE p.id = $1`,
        [id]
      ),
      query(
        `SELECT data_servico, turno, hora_entrada, hora_saida, funcao
         FROM escalas
         WHERE id_policial = $1
           AND data_servico >= CURRENT_DATE - INTERVAL '30 days'
         ORDER BY data_servico DESC LIMIT 20`,
        [id]
      ),
      query(
        `SELECT tipo, data_inicio, data_fim, dias_total, cid, descricao
         FROM licencas
         WHERE id_policial = $1
         ORDER BY data_inicio DESC LIMIT 10`,
        [id]
      ),
    ]);

    if (!pm[0]) return res.status(404).json({ erro: 'Policial não encontrado' });

    // Oculta CPF — retorna apenas últimos 3 dígitos
    const policial = { ...pm[0] };
    if (policial.cpf) {
      policial.cpf = `***.***.***-${policial.cpf.slice(-2)}`;
    }

    res.json({ ...policial, escalas_recentes: escalasRecentes, licencas });
  } catch (err) {
    logger.error('Erro ao buscar policial', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar policial' });
  }
};

/**
 * POST /api/v1/policiais
 */
const criar = async (req, res) => {
  const {
    rg_pm, cpf, nome_completo, nome_guerra, sexo,
    data_nascimento, data_ingresso, posto_graduacao,
    id_unidade, email_corporativo, telefone_funcional,
  } = req.body;

  try {
    // Verifica duplicatas
    const { rows: existe } = await query(
      'SELECT id FROM policiais WHERE rg_pm=$1 OR cpf=$2',
      [rg_pm, cpf]
    );
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'RG PM ou CPF já cadastrado' });
    }

    const { rows } = await query(
      `INSERT INTO policiais (
         rg_pm, cpf, nome_completo, nome_guerra, sexo,
         data_nascimento, data_ingresso, posto_graduacao,
         id_unidade, email_corporativo, telefone_funcional
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, rg_pm, nome_guerra, posto_graduacao`,
      [
        rg_pm, cpf, nome_completo, nome_guerra, sexo,
        data_nascimento, data_ingresso, posto_graduacao,
        id_unidade, email_corporativo, telefone_funcional,
      ]
    );

    logger.info('Policial cadastrado', { rg_pm, usuario: req.usuario.login });
    res.status(201).json({ mensagem: 'Policial cadastrado com sucesso', dados: rows[0] });
  } catch (err) {
    logger.error('Erro ao criar policial', { error: err.message });
    res.status(500).json({ erro: 'Erro ao cadastrar policial' });
  }
};

/**
 * PUT /api/v1/policiais/:id
 */
const atualizar = async (req, res) => {
  const { id } = req.params;
  const {
    nome_guerra, posto_graduacao, situacao,
    id_unidade, email_corporativo, telefone_funcional, observacoes,
  } = req.body;

  try {
    const { rowCount } = await query(
      `UPDATE policiais SET
         nome_guerra         = COALESCE($1, nome_guerra),
         posto_graduacao     = COALESCE($2, posto_graduacao),
         situacao            = COALESCE($3, situacao),
         id_unidade          = COALESCE($4, id_unidade),
         email_corporativo   = COALESCE($5, email_corporativo),
         telefone_funcional  = COALESCE($6, telefone_funcional),
         observacoes         = COALESCE($7, observacoes),
         atualizado_em       = NOW()
       WHERE id = $8`,
      [nome_guerra, posto_graduacao, situacao, id_unidade,
       email_corporativo, telefone_funcional, observacoes, id]
    );

    if (rowCount === 0) return res.status(404).json({ erro: 'Policial não encontrado' });

    logger.info('Policial atualizado', { id, usuario: req.usuario.login });
    res.json({ mensagem: 'Policial atualizado com sucesso' });
  } catch (err) {
    logger.error('Erro ao atualizar policial', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao atualizar policial' });
  }
};

// ============================================================
//  ESCALAS
// ============================================================

/**
 * GET /api/v1/escalas
 */
const listarEscalas = async (req, res) => {
  const { data, id_unidade, turno, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const filtros = [];

  // Restringe por unidade se não for gestor
  const { perfil, id_unidade: unidadeUsuario } = req.usuario;
  if (!['Gestor', 'Comandante', 'Administrador'].includes(perfil)) {
    filtros.push(`e.id_unidade = $${params.push(unidadeUsuario)}`);
  } else if (id_unidade) {
    filtros.push(`e.id_unidade = $${params.push(id_unidade)}`);
  }

  if (data)  filtros.push(`e.data_servico = $${params.push(data)}`);
  if (turno) filtros.push(`e.turno = $${params.push(turno)}`);

  // Padrão: próximos 7 dias se não especificar data
  if (!data) {
    filtros.push(`e.data_servico BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`);
  }

  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  try {
    const { rows } = await query(
      `SELECT
         e.id, e.data_servico, e.turno, e.hora_entrada, e.hora_saida, e.funcao,
         p.rg_pm, p.nome_guerra, p.posto_graduacao,
         u.codigo AS unidade_codigo
       FROM escalas e
       JOIN policiais p ON p.id = e.id_policial
       JOIN unidades u ON u.id = e.id_unidade
       ${where}
       ORDER BY e.data_servico, e.turno, p.posto_graduacao
       LIMIT $${params.push(parseInt(limit))} OFFSET $${params.push(offset)}`,
      params
    );

    res.json({ dados: rows });
  } catch (err) {
    logger.error('Erro ao listar escalas', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar escalas' });
  }
};

/**
 * POST /api/v1/escalas
 */
const criarEscala = async (req, res) => {
  const { id_policial, id_unidade, data_servico, turno, hora_entrada, hora_saida, funcao } = req.body;

  if (!id_policial || !data_servico || !turno || !hora_entrada || !hora_saida) {
    return res.status(400).json({ erro: 'Campos obrigatórios: id_policial, data_servico, turno, hora_entrada, hora_saida' });
  }

  try {
    // Verifica conflito de escala
    const { rows: conflito } = await query(
      `SELECT id FROM escalas
       WHERE id_policial = $1 AND data_servico = $2`,
      [id_policial, data_servico]
    );

    if (conflito.length > 0) {
      return res.status(409).json({ erro: 'Policial já possui escala nesta data' });
    }

    // Verifica se está de licença
    const { rows: licenca } = await query(
      `SELECT id, tipo FROM licencas
       WHERE id_policial = $1
         AND $2 BETWEEN data_inicio AND data_fim`,
      [id_policial, data_servico]
    );

    if (licenca.length > 0) {
      return res.status(409).json({
        erro: `Policial está de ${licenca[0].tipo} nesta data`,
      });
    }

    const { rows } = await query(
      `INSERT INTO escalas (id_policial, id_unidade, data_servico, turno, hora_entrada, hora_saida, funcao, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        id_policial,
        id_unidade || req.usuario.id_unidade,
        data_servico, turno, hora_entrada, hora_saida,
        funcao || null,
        req.usuario.id,
      ]
    );

    res.status(201).json({ mensagem: 'Escala criada com sucesso', id: rows[0].id });
  } catch (err) {
    logger.error('Erro ao criar escala', { error: err.message });
    res.status(500).json({ erro: 'Erro ao criar escala' });
  }
};

// ============================================================
//  LICENÇAS
// ============================================================

/**
 * POST /api/v1/licencas
 */
const criarLicenca = async (req, res) => {
  const { id_policial, tipo, data_inicio, data_fim, cid, descricao } = req.body;

  if (!id_policial || !tipo || !data_inicio || !data_fim) {
    return res.status(400).json({ erro: 'Campos obrigatórios: id_policial, tipo, data_inicio, data_fim' });
  }

  try {
    await transaction(async (client) => {
      // Cria licença
      await client.query(
        `INSERT INTO licencas (id_policial, tipo, data_inicio, data_fim, cid, descricao, aprovado_por, aprovado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [id_policial, tipo, data_inicio, data_fim, cid || null, descricao || null, req.usuario.id]
      );

      // Atualiza situação do policial
      const situacaoMap = {
        'Férias':        'Férias',
        'Médica':        'Licença Médica',
        'Especial':      'Licença Especial',
        'Afastamento':   'Afastado',
      };
      const novaSituacao = situacaoMap[tipo] || 'Licença Médica';

      await client.query(
        `UPDATE policiais SET situacao = $1, atualizado_em = NOW() WHERE id = $2`,
        [novaSituacao, id_policial]
      );
    });

    res.status(201).json({ mensagem: 'Licença registrada com sucesso' });
  } catch (err) {
    logger.error('Erro ao criar licença', { error: err.message });
    res.status(500).json({ erro: 'Erro ao registrar licença' });
  }
};

module.exports = {
  listar, efeitoHoje, buscarPorId, criar, atualizar,
  listarEscalas, criarEscala, criarLicenca,
};
