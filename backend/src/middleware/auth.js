// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verifica e decodifica o JWT do header Authorization
 */
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca usuário ativo no banco para validar bloqueio/desativação
    const { rows } = await query(
      `SELECT u.id, u.login, u.perfil, u.ativo, u.bloqueado_ate,
              p.rg_pm, p.nome_guerra, p.posto_graduacao, p.id_unidade
       FROM usuarios u
       LEFT JOIN policiais p ON p.id = u.id_policial
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (!rows[0]) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    const usuario = rows[0];

    if (!usuario.ativo) {
      return res.status(401).json({ erro: 'Usuário desativado' });
    }

    if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
      return res.status(401).json({ erro: 'Usuário temporariamente bloqueado' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ erro: 'Token inválido' });
    }
    logger.error('Erro na autenticação', { error: err.message });
    res.status(500).json({ erro: 'Erro interno de autenticação' });
  }
};

/**
 * Verifica se o usuário tem um dos perfis permitidos
 * Uso: autorizar('Gestor', 'Comandante', 'Administrador')
 */
const autorizar = (...perfisPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Não autenticado' });
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      logger.warn('Acesso negado por perfil insuficiente', {
        usuario: req.usuario.login,
        perfil: req.usuario.perfil,
        perfisNecessarios: perfisPermitidos,
        rota: req.originalUrl,
      });
      return res.status(403).json({
        erro: 'Acesso negado. Permissão insuficiente.',
        perfil_necessario: perfisPermitidos,
      });
    }
    next();
  };
};

/**
 * Garante que só o próprio usuário ou um gestor+ pode acessar o recurso
 */
const autorizarProprioOuGestor = (paramId = 'id') => {
  return (req, res, next) => {
    const { usuario } = req;
    const idRecurso = req.params[paramId];
    const perfisGestores = ['Gestor', 'Comandante', 'Administrador'];

    if (usuario.id_policial === idRecurso || perfisGestores.includes(usuario.perfil)) {
      return next();
    }

    return res.status(403).json({ erro: 'Acesso negado.' });
  };
};

module.exports = { autenticar, autorizar, autorizarProprioOuGestor };
