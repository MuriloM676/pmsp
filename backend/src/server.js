// src/server.js
require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const logger  = require('./utils/logger');
const routes  = require('./routes');
const { pool } = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 3001;
const PREFIX = process.env.API_PREFIX || '/api/v1';

// ============================================================
//  SEGURANÇA & MIDDLEWARES GLOBAIS
// ============================================================

// Headers de segurança HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
    },
  },
}));

// CORS configurado para origens confiáveis
const origensPermitidas = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origensPermitidas.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS bloqueado para origem', { origin });
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting global
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { erro: 'Muitas requisições. Tente novamente em breve.' },
}));

// Rate limiting específico para login (anti brute-force adicional)
app.use(`${PREFIX}/auth/login`, rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' },
}));

// Parsing, cookies e compressão
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Log de requisições HTTP
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/api/v1/health',
}));

// Confiança em proxy reverso (Nginx)
app.set('trust proxy', 1);

// ============================================================
//  ROTAS
// ============================================================

app.use(PREFIX, routes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    sistema: 'SIGPOL — Sistema Integrado de Gestão Policial',
    orgao: 'Polícia Militar do Estado de São Paulo',
    versao: '1.0.0',
    api: PREFIX,
    status: 'operacional',
    classificacao: 'INTERNO RESTRITO',
  });
});

// ============================================================
//  TRATAMENTO DE ERROS
// ============================================================

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada', path: req.originalUrl });
});

// Erro global
app.use((err, req, res, _next) => {
  logger.error('Erro não tratado', {
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  if (err.message?.includes('CORS')) {
    return res.status(403).json({ erro: 'Origem não autorizada' });
  }

  res.status(500).json({
    erro: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
  });
});

// ============================================================
//  STARTUP
// ============================================================

const iniciar = async () => {
  try {
    // Testa conexão com o banco
    await pool.query('SELECT 1');
    logger.info('✅ Conexão com PostgreSQL estabelecida');

    app.listen(PORT, () => {
      logger.info(`🚔 SIGPOL API iniciada`, {
        porta: PORT,
        ambiente: process.env.NODE_ENV,
        prefix: PREFIX,
      });
    });
  } catch (err) {
    logger.error('❌ Falha ao iniciar servidor', { error: err.message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido. Encerrando servidor...');
  await pool.end();
  process.exit(0);
});

iniciar();

module.exports = app; // para testes
