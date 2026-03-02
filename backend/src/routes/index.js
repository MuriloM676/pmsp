// src/routes/index.js
const express = require('express');
const { body, param, query } = require('express-validator');
const { autenticar, autorizar } = require('../middleware/auth');
const { registrarAuditoria } = require('../middleware/auditoria');
const validar = require('../middleware/validar');

// Controllers
const authController         = require('../controllers/authController');
const ocorrenciasController  = require('../controllers/ocorrenciasController');
const policiaisController    = require('../controllers/policiaisController');
const viaturasController     = require('../controllers/viaturasController');
const inteligenciaController = require('../controllers/inteligenciaController');

const router = express.Router();

// ============================================================
//  HEALTH CHECK
// ============================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    sistema: 'SIGPOL',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
//  AUTENTICAÇÃO
// ============================================================
router.post('/auth/login',
  [
    body('login').notEmpty().withMessage('Login obrigatório'),
    body('senha').isLength({ min: 6 }).withMessage('Senha inválida'),
  ],
  validar,
  authController.login
);

router.post('/auth/refresh', authController.refreshToken);

router.post('/auth/logout', authController.logout);

router.get('/auth/me',
  autenticar,
  authController.me
);

// ============================================================
//  OCORRÊNCIAS
// ============================================================
router.get('/ocorrencias/dashboard',
  autenticar,
  ocorrenciasController.dashboard
);

router.get('/ocorrencias',
  autenticar,
  ocorrenciasController.listar
);

router.get('/ocorrencias/:id',
  autenticar,
  param('id').isUUID(),
  validar,
  ocorrenciasController.buscarPorId
);

router.post('/ocorrencias',
  autenticar,
  registrarAuditoria('CRIAR_OCORRENCIA'),
  [
    body('natureza').notEmpty().withMessage('Natureza obrigatória'),
    body('data_hora_fato').isISO8601().withMessage('Data/hora inválida'),
    body('logradouro').notEmpty().withMessage('Logradouro obrigatório'),
  ],
  validar,
  ocorrenciasController.criar
);

router.patch('/ocorrencias/:id/status',
  autenticar,
  registrarAuditoria('ATUALIZAR_STATUS_OCORRENCIA'),
  [
    param('id').isUUID(),
    body('status').isIn(['Despachada','Em Atendimento','Aguardando DP','Encerrada','Cancelada']),
  ],
  validar,
  ocorrenciasController.atualizarStatus
);

// ============================================================
//  POLICIAIS / RH
// ============================================================
router.get('/policiais',
  autenticar,
  autorizar('Gestor', 'Comandante', 'Administrador'),
  policiaisController.listar
);

router.get('/policiais/efetivo-hoje',
  autenticar,
  policiaisController.efeitoHoje
);

router.get('/policiais/:id',
  autenticar,
  param('id').isUUID(),
  validar,
  policiaisController.buscarPorId
);

router.post('/policiais',
  autenticar,
  autorizar('Administrador'),
  registrarAuditoria('CRIAR_POLICIAL'),
  [
    body('rg_pm').notEmpty(),
    body('cpf').isTaxID('pt-BR').withMessage('CPF inválido'),
    body('nome_completo').notEmpty(),
    body('posto_graduacao').notEmpty(),
  ],
  validar,
  policiaisController.criar
);

router.put('/policiais/:id',
  autenticar,
  autorizar('Gestor', 'Administrador'),
  registrarAuditoria('ATUALIZAR_POLICIAL'),
  param('id').isUUID(),
  validar,
  policiaisController.atualizar
);

router.get('/escalas',
  autenticar,
  policiaisController.listarEscalas
);

router.post('/escalas',
  autenticar,
  autorizar('Supervisor', 'Gestor', 'Comandante', 'Administrador'),
  registrarAuditoria('CRIAR_ESCALA'),
  policiaisController.criarEscala
);

// ============================================================
//  VIATURAS
// ============================================================
router.get('/viaturas',
  autenticar,
  viaturasController.listar
);

router.get('/viaturas/:id',
  autenticar,
  param('id').isUUID(),
  validar,
  viaturasController.buscarPorId
);

router.post('/viaturas',
  autenticar,
  autorizar('Gestor', 'Administrador'),
  registrarAuditoria('CRIAR_VIATURA'),
  [
    body('prefixo').notEmpty(),
    body('placa').notEmpty(),
    body('tipo').notEmpty(),
  ],
  validar,
  viaturasController.criar
);

router.patch('/viaturas/:id/status',
  autenticar,
  autorizar('Supervisor', 'Gestor', 'Administrador'),
  registrarAuditoria('ATUALIZAR_STATUS_VIATURA'),
  viaturasController.atualizarStatus
);

router.get('/manutencoes',
  autenticar,
  viaturasController.listarManutencoes
);

router.post('/manutencoes',
  autenticar,
  autorizar('Supervisor', 'Gestor', 'Administrador'),
  registrarAuditoria('CRIAR_MANUTENCAO'),
  viaturasController.criarManutencao
);

router.patch('/manutencoes/:id/concluir',
  autenticar,
  autorizar('Supervisor', 'Gestor', 'Administrador'),
  registrarAuditoria('CONCLUIR_MANUTENCAO'),
  viaturasController.concluirManutencao
);

router.post('/viaturas/:id/rastreamento',
  autenticar,
  viaturasController.registrarPosicao
);

// ============================================================
//  LICENÇAS
// ============================================================
router.post('/licencas',
  autenticar,
  autorizar('Supervisor', 'Gestor', 'Comandante', 'Administrador'),
  registrarAuditoria('CRIAR_LICENCA'),
  [
    body('id_policial').isUUID(),
    body('tipo').notEmpty(),
    body('data_inicio').isISO8601(),
    body('data_fim').isISO8601(),
  ],
  validar,
  policiaisController.criarLicenca
);

// ============================================================
//  INTELIGÊNCIA
// ============================================================
router.get('/inteligencia/heatmap',
  autenticar,
  autorizar('Gestor', 'Comandante', 'Administrador'),
  inteligenciaController.heatmap
);

router.get('/inteligencia/estatisticas',
  autenticar,
  inteligenciaController.estatisticas
);

router.get('/inteligencia/tendencias',
  autenticar,
  inteligenciaController.tendencias
);

// ============================================================
//  AUDITORIA (só Admins)
// ============================================================
router.get('/auditoria',
  autenticar,
  autorizar('Administrador'),
  async (req, res) => {
    const { rows } = await require('../config/database').query(
      `SELECT a.*, u.login FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.id_usuario
       ORDER BY a.registrado_em DESC LIMIT 100`
    );
    res.json(rows);
  }
);

module.exports = router;
