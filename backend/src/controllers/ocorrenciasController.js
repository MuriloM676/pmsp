// src/controllers/ocorrenciasController.js
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/ocorrencias
 * Lista com filtros, paginação e ordenação
 */
const listar = async (req, res) => {
  const {
    status, prioridade, natureza, id_unidade,
    data_inicio, data_fim, viatura,
    page = 1, limit = 20,
  } = req.query;

  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);
  const offset = (Math.max(1, parseInt(page) || 1) - 1) * safeLimit;
  const params = [];
  const filtros = [];

  // Operadores sem privilégio de gestor só veem a própria unidade
  const { perfil, id_unidade: unidadeUsuario } = req.usuario;
  if (!['Gestor', 'Comandante', 'Administrador'].includes(perfil)) {
    filtros.push(`o.id_unidade = $${params.push(unidadeUsuario)}`);
  } else if (id_unidade) {
    filtros.push(`o.id_unidade = $${params.push(id_unidade)}`);
  }

  if (status)       filtros.push(`o.status = $${params.push(status)}`);
  if (prioridade)   filtros.push(`o.prioridade = $${params.push(prioridade)}`);
  if (natureza)     filtros.push(`o.natureza = $${params.push(natureza)}`);
  if (viatura)      filtros.push(`v.prefixo ILIKE $${params.push('%' + viatura + '%')}`);
  if (data_inicio)  filtros.push(`o.data_hora_fato >= $${params.push(data_inicio)}`);
  if (data_fim)     filtros.push(`o.data_hora_fato <= $${params.push(data_fim + ' 23:59:59')}`);

  const where = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  try {
    const { rows: ocorrencias } = await query(
      `SELECT
         o.id, o.numero_bo, o.natureza, o.prioridade, o.status,
         o.logradouro, o.numero, o.bairro, o.cidade,
         o.data_hora_fato, o.data_hora_abertura, o.data_hora_chegada,
         o.envolve_menor, o.uso_de_arma,
         u.codigo AS unidade_codigo, u.nome AS unidade_nome,
         v.prefixo AS viatura_prefixo,
         EXTRACT(EPOCH FROM (o.data_hora_chegada - o.data_hora_despacho))/60 AS tempo_resposta_min
       FROM ocorrencias o
       LEFT JOIN unidades u ON u.id = o.id_unidade
       LEFT JOIN viaturas v ON v.id = o.id_viatura
       ${where}
       ORDER BY
         CASE o.prioridade WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
         o.data_hora_abertura DESC
       LIMIT $${params.push(safeLimit)} OFFSET $${params.push(offset)}`,
      params
    );

    // Total para paginação (sem LIMIT)
    const countParams = params.slice(0, params.length - 2);
    const { rows: countResult } = await query(
      `SELECT COUNT(*) AS total
       FROM ocorrencias o
       LEFT JOIN viaturas v ON v.id = o.id_viatura
       ${where}`,
      countParams
    );

    const total = parseInt(countResult[0].total);

    res.json({
      dados: ocorrencias,
      paginacao: {
        total,
        pagina: Math.max(1, parseInt(page) || 1),
        limite: safeLimit,
        paginas: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    logger.error('Erro ao listar ocorrências', { error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar ocorrências' });
  }
};

/**
 * GET /api/v1/ocorrencias/:id
 */
const buscarPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const [{ rows: oc }, { rows: policiais }, { rows: envolvidos }, { rows: historico }] =
      await Promise.all([
        query(
          `SELECT o.*, u.codigo AS unidade_codigo, v.prefixo AS viatura_prefixo, v.placa
           FROM ocorrencias o
           LEFT JOIN unidades u ON u.id = o.id_unidade
           LEFT JOIN viaturas v ON v.id = o.id_viatura
           WHERE o.id = $1`,
          [id]
        ),
        query(
          `SELECT p.rg_pm, p.nome_guerra, p.posto_graduacao, op.funcao
           FROM ocorrencia_policiais op
           JOIN policiais p ON p.id = op.id_policial
           WHERE op.id_ocorrencia = $1`,
          [id]
        ),
        query(
          'SELECT * FROM envolvidos WHERE id_ocorrencia = $1 ORDER BY papel, nome',
          [id]
        ),
        query(
          `SELECT h.acao, h.detalhes, h.registrado_em, u.login, p.nome_guerra
           FROM ocorrencia_historico h
           LEFT JOIN usuarios u ON u.id = h.id_usuario
           LEFT JOIN policiais p ON p.id = u.id_policial
           WHERE h.id_ocorrencia = $1
           ORDER BY h.registrado_em`,
          [id]
        ),
      ]);

    if (!oc[0]) return res.status(404).json({ erro: 'Ocorrência não encontrada' });

    res.json({ ...oc[0], policiais, envolvidos, historico });
  } catch (err) {
    logger.error('Erro ao buscar ocorrência', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao buscar ocorrência' });
  }
};

/**
 * POST /api/v1/ocorrencias
 */
const criar = async (req, res) => {
  const {
    natureza, descricao, prioridade,
    logradouro, numero, bairro, cidade, cep, latitude, longitude,
    ponto_referencia, data_hora_fato, id_viatura,
    envolve_menor, morte_no_local, uso_de_arma, observacoes,
    policiais_ids = [],
  } = req.body;

  try {
    const result = await transaction(async (client) => {
      // Insere ocorrência
      const { rows } = await client.query(
        `INSERT INTO ocorrencias (
           natureza, descricao, prioridade, status,
           logradouro, numero, bairro, cidade, cep,
           localizacao, ponto_referencia,
           data_hora_fato, id_unidade, id_viatura,
           envolve_menor, morte_no_local, uso_de_arma,
           observacoes, registrado_por
         ) VALUES (
           $1,$2,$3,'Aberta',
           $4,$5,$6,$7,$8,
           $9, $10,
           $11,$12,$13,
           $14,$15,$16,
           $17,$18
         ) RETURNING *`,
        [
          natureza, descricao, prioridade || 'P3',
          logradouro, numero, bairro, cidade || 'São Paulo', cep,
          latitude && longitude ? `POINT(${longitude} ${latitude})` : null,
          ponto_referencia,
          data_hora_fato, req.usuario.id_unidade, id_viatura || null,
          envolve_menor || false, morte_no_local || false, uso_de_arma || false,
          observacoes, req.usuario.id,
        ]
      );

      const ocorrencia = rows[0];

      // Vincula policiais
      if (policiais_ids.length > 0) {
        const vals = policiais_ids
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ');
        await client.query(
          `INSERT INTO ocorrencia_policiais (id_ocorrencia, id_policial) VALUES ${vals}`,
          [ocorrencia.id, ...policiais_ids]
        );
      }

      // Primeiro log de histórico
      await client.query(
        `INSERT INTO ocorrencia_historico (id_ocorrencia, id_usuario, acao, detalhes)
         VALUES ($1, $2, 'ABERTA', 'Ocorrência registrada no sistema')`,
        [ocorrencia.id, req.usuario.id]
      );

      // Se P1, despacha imediatamente
      if ((prioridade || 'P3') === 'P1' && id_viatura) {
        await client.query(
          `UPDATE ocorrencias SET status='Despachada', data_hora_despacho=NOW()
           WHERE id=$1`,
          [ocorrencia.id]
        );
        await client.query(
          `UPDATE viaturas SET status='Em Ocorrência' WHERE id=$1`,
          [id_viatura]
        );
        await client.query(
          `INSERT INTO ocorrencia_historico (id_ocorrencia, id_usuario, acao, detalhes)
           VALUES ($1, $2, 'DESPACHADA', 'Despacho automático P1')`,
          [ocorrencia.id, req.usuario.id]
        );
      }

      return ocorrencia;
    });

    logger.info('Ocorrência criada', { numero_bo: result.numero_bo, usuario: req.usuario.login });
    res.status(201).json({ mensagem: 'Ocorrência registrada com sucesso', id: result.id, numero_bo: result.numero_bo });
  } catch (err) {
    logger.error('Erro ao criar ocorrência', { error: err.message });
    res.status(500).json({ erro: 'Erro ao registrar ocorrência' });
  }
};

/**
 * PATCH /api/v1/ocorrencias/:id/status
 */
const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status, detalhes } = req.body;

  const transicoesValidas = {
    'Aberta':          ['Despachada', 'Cancelada'],
    'Despachada':      ['Em Atendimento', 'Cancelada'],
    'Em Atendimento':  ['Aguardando DP', 'Encerrada'],
    'Aguardando DP':   ['Encerrada'],
  };

  try {
    const { rows } = await query('SELECT status, id_viatura FROM ocorrencias WHERE id=$1', [id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Ocorrência não encontrada' });

    const statusAtual = rows[0].status;
    const statusPermitidos = transicoesValidas[statusAtual] || [];

    if (!statusPermitidos.includes(status)) {
      return res.status(400).json({
        erro: `Transição inválida: ${statusAtual} → ${status}`,
        permitidos: statusPermitidos,
      });
    }

    await transaction(async (client) => {
      const camposData = {
        'Despachada':     'data_hora_despacho',
        'Em Atendimento': 'data_hora_chegada',
        'Encerrada':      'data_hora_encerramento',
      };
      const campoData = camposData[status];

      await client.query(
        `UPDATE ocorrencias SET
           status = $1,
           ${campoData ? `${campoData} = NOW(),` : ''}
           atualizado_em = NOW()
         WHERE id = $2`,
        [status, id]
      );

      // Libera viatura se encerrada/cancelada
      if (['Encerrada', 'Cancelada'].includes(status) && rows[0].id_viatura) {
        await client.query(
          `UPDATE viaturas SET status='Disponível' WHERE id=$1`,
          [rows[0].id_viatura]
        );
      }

      await client.query(
        `INSERT INTO ocorrencia_historico (id_ocorrencia, id_usuario, acao, detalhes)
         VALUES ($1, $2, $3, $4)`,
        [id, req.usuario.id, `STATUS_${status.toUpperCase().replace(' ', '_')}`, detalhes || null]
      );
    });

    res.json({ mensagem: `Status atualizado para ${status}` });
  } catch (err) {
    logger.error('Erro ao atualizar status', { id, error: err.message });
    res.status(500).json({ erro: 'Erro ao atualizar status' });
  }
};

/**
 * GET /api/v1/ocorrencias/dashboard
 * Dados para o painel operacional
 */
const dashboard = async (req, res) => {
  try {
    const [resumo, porPrioridade, porNatureza, tempoResposta] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE DATE(data_hora_fato) = CURRENT_DATE) AS hoje,
          COUNT(*) FILTER (WHERE status NOT IN ('Encerrada','Cancelada')) AS abertas,
          COUNT(*) FILTER (WHERE prioridade='P1' AND status NOT IN ('Encerrada','Cancelada')) AS p1_abertas,
          COUNT(*) FILTER (WHERE data_hora_chegada IS NOT NULL AND DATE(data_hora_chegada) = CURRENT_DATE) AS atendidas_hoje
        FROM ocorrencias
      `),
      query(`
        SELECT prioridade, COUNT(*) AS total
        FROM ocorrencias
        WHERE status NOT IN ('Encerrada','Cancelada')
        GROUP BY prioridade ORDER BY prioridade
      `),
      query(`
        SELECT natureza, COUNT(*) AS total
        FROM ocorrencias
        WHERE data_hora_fato >= NOW() - INTERVAL '30 days'
        GROUP BY natureza ORDER BY total DESC LIMIT 10
      `),
      query(`
        SELECT
          ROUND(AVG(EXTRACT(EPOCH FROM (data_hora_chegada - data_hora_despacho))/60)::numeric, 1) AS media_minutos
        FROM ocorrencias
        WHERE data_hora_chegada IS NOT NULL
          AND data_hora_despacho IS NOT NULL
          AND data_hora_fato >= NOW() - INTERVAL '7 days'
      `),
    ]);

    res.json({
      resumo: resumo.rows[0],
      por_prioridade: porPrioridade.rows,
      por_natureza: porNatureza.rows,
      tempo_resposta_medio: tempoResposta.rows[0]?.media_minutos,
    });
  } catch (err) {
    logger.error('Erro no dashboard', { error: err.message });
    res.status(500).json({ erro: 'Erro ao carregar dashboard' });
  }
};

module.exports = { listar, buscarPorId, criar, atualizarStatus, dashboard };
