// src/controllers/inteligenciaController.js
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /api/v1/inteligencia/heatmap
 * Coordenadas das ocorrências para renderizar no mapa de calor
 */
const heatmap = async (req, res) => {
  const { dias = 30, natureza, prioridade } = req.query;
  const params = [parseInt(dias)];
  const filtros = [`o.data_hora_fato >= NOW() - ($1 || ' days')::INTERVAL`];
  const filtros_extra = [`o.localizacao IS NOT NULL`];

  if (natureza)   filtros_extra.push(`o.natureza = $${params.push(natureza)}`);
  if (prioridade) filtros_extra.push(`o.prioridade = $${params.push(prioridade)}`);

  const where = `WHERE ${[...filtros, ...filtros_extra].join(' AND ')}`;

  try {
    const { rows } = await query(
      `SELECT
         ST_Y(localizacao::geometry) AS lat,
         ST_X(localizacao::geometry) AS lng,
         natureza,
         prioridade,
         COUNT(*) AS peso
       FROM ocorrencias o
       ${where}
       GROUP BY lat, lng, natureza, prioridade`,
      params
    );

    res.json({ pontos: rows, total: rows.length, periodo_dias: parseInt(dias) });
  } catch (err) {
    logger.error('Erro no heatmap', { error: err.message });
    res.status(500).json({ erro: 'Erro ao gerar heatmap' });
  }
};

/**
 * GET /api/v1/inteligencia/estatisticas
 */
const estatisticas = async (req, res) => {
  const { dias = 30 } = req.query;

  try {
    const [porNatureza, porHora, porDiaSemana, topBairros, evolucao] = await Promise.all([
      // Crimes por natureza
      query(
        `SELECT natureza, COUNT(*) AS total,
                COUNT(*) FILTER (WHERE prioridade='P1') AS p1
         FROM ocorrencias
         WHERE data_hora_fato >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY natureza ORDER BY total DESC`,
        [dias]
      ),
      // Distribuição por hora do dia
      query(
        `SELECT EXTRACT(HOUR FROM data_hora_fato)::INT AS hora, COUNT(*) AS total
         FROM ocorrencias
         WHERE data_hora_fato >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY hora ORDER BY hora`,
        [dias]
      ),
      // Distribuição por dia da semana
      query(
        `SELECT TO_CHAR(data_hora_fato, 'D')::INT AS dia_semana,
                TO_CHAR(data_hora_fato, 'Day') AS nome,
                COUNT(*) AS total
         FROM ocorrencias
         WHERE data_hora_fato >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY dia_semana, nome ORDER BY dia_semana`,
        [dias]
      ),
      // Top bairros
      query(
        `SELECT bairro, COUNT(*) AS total
         FROM ocorrencias
         WHERE data_hora_fato >= NOW() - ($1 || ' days')::INTERVAL
           AND bairro IS NOT NULL
         GROUP BY bairro ORDER BY total DESC LIMIT 10`,
        [dias]
      ),
      // Evolução diária
      query(
        `SELECT DATE(data_hora_fato) AS data, COUNT(*) AS total,
                COUNT(*) FILTER (WHERE prioridade IN ('P1','P2')) AS graves
         FROM ocorrencias
         WHERE data_hora_fato >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY DATE(data_hora_fato) ORDER BY data`,
        [dias]
      ),
    ]);

    res.json({
      por_natureza:   porNatureza.rows,
      por_hora:       porHora.rows,
      por_dia_semana: porDiaSemana.rows,
      top_bairros:    topBairros.rows,
      evolucao_diaria: evolucao.rows,
      periodo_dias:   parseInt(dias),
    });
  } catch (err) {
    logger.error('Erro nas estatísticas', { error: err.message });
    res.status(500).json({ erro: 'Erro ao carregar estatísticas' });
  }
};

/**
 * GET /api/v1/inteligencia/tendencias
 * Compara período atual vs período anterior para identificar tendências
 */
const tendencias = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        natureza,
        COUNT(*) FILTER (WHERE data_hora_fato >= NOW() - INTERVAL '30 days') AS atual,
        COUNT(*) FILTER (WHERE data_hora_fato BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days') AS anterior,
        ROUND(
          (COUNT(*) FILTER (WHERE data_hora_fato >= NOW() - INTERVAL '30 days')::numeric -
           COUNT(*) FILTER (WHERE data_hora_fato BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days')::numeric)
          /
          NULLIF(COUNT(*) FILTER (WHERE data_hora_fato BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'), 0)
          * 100, 1
        ) AS variacao_pct
      FROM ocorrencias
      WHERE data_hora_fato >= NOW() - INTERVAL '60 days'
      GROUP BY natureza
      ORDER BY ABS(
        COALESCE(
          (COUNT(*) FILTER (WHERE data_hora_fato >= NOW() - INTERVAL '30 days')::numeric -
           COUNT(*) FILTER (WHERE data_hora_fato BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days')::numeric)
          /
          NULLIF(COUNT(*) FILTER (WHERE data_hora_fato BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'), 0),
          0
        )
      ) DESC
    `);

    res.json({ tendencias: rows });
  } catch (err) {
    logger.error('Erro nas tendências', { error: err.message });
    res.status(500).json({ erro: 'Erro ao calcular tendências' });
  }
};

module.exports = { heatmap, estatisticas, tendencias };
