// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 30;

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  const { login: loginInput, senha } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // Busca usuário
    const { rows } = await query(
      `SELECT u.id, u.login, u.senha_hash, u.perfil, u.ativo,
              u.tentativas_falha, u.bloqueado_ate,
              p.rg_pm, p.nome_guerra, p.posto_graduacao, p.id_unidade, p.foto_url
       FROM usuarios u
       LEFT JOIN policiais p ON p.id = u.id_policial
       WHERE u.login = $1`,
      [loginInput.trim()]
    );

    const usuario = rows[0];

    // Usuário inexistente — mesma mensagem de erro (evita enumeração)
    if (!usuario) {
      logger.warn('Tentativa de login com usuário inexistente', { login: loginInput, ip });
      return res.status(401).json({ erro: 'Login ou senha inválidos' });
    }

    // Conta desativada
    if (!usuario.ativo) {
      return res.status(401).json({ erro: 'Usuário desativado. Contate o administrador.' });
    }

    // Conta bloqueada temporariamente
    if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
      const ate = new Date(usuario.bloqueado_ate).toLocaleTimeString('pt-BR');
      return res.status(401).json({
        erro: `Conta bloqueada por excesso de tentativas. Tente novamente após ${ate}.`
      });
    }

    // Verifica senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      const novasTentativas = (usuario.tentativas_falha || 0) + 1;
      const bloquear = novasTentativas >= MAX_TENTATIVAS;

      await query(
        `UPDATE usuarios SET
           tentativas_falha = $1,
           bloqueado_ate     = $2
         WHERE id = $3`,
        [
          bloquear ? 0 : novasTentativas,
          bloquear ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000) : null,
          usuario.id,
        ]
      );

      logger.warn('Falha de autenticação', { login: loginInput, ip, tentativas: novasTentativas });

      if (bloquear) {
        return res.status(401).json({
          erro: `Conta bloqueada por ${BLOQUEIO_MINUTOS} minutos após múltiplas tentativas.`
        });
      }

      return res.status(401).json({
        erro: 'Login ou senha inválidos',
        tentativas_restantes: MAX_TENTATIVAS - novasTentativas,
      });
    }

    // Autenticado — zera tentativas e atualiza último acesso
    await query(
      `UPDATE usuarios SET
         tentativas_falha = 0,
         bloqueado_ate    = NULL,
         ultimo_acesso    = NOW(),
         ip_ultimo_acesso = $1
       WHERE id = $2`,
      [ip, usuario.id]
    );

    // Gera tokens
    const payload = {
      id:       usuario.id,
      login:    usuario.login,
      perfil:   usuario.perfil,
      unidade:  usuario.id_unidade,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    const refreshToken = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    logger.info('Login bem-sucedido', { login: loginInput, ip, perfil: usuario.perfil });

    // Refresh token via cookie httpOnly (não exposto ao JS)
    res.cookie('sigpol_rt', refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 dias em ms
      path:     '/api/v1/auth',
    });

    return res.json({
      token,
      usuario: {
        id:             usuario.id,
        login:          usuario.login,
        perfil:         usuario.perfil,
        nome_guerra:    usuario.nome_guerra,
        posto_graduacao: usuario.posto_graduacao,
        rg_pm:          usuario.rg_pm,
        id_unidade:     usuario.id_unidade,
        foto_url:       usuario.foto_url,
      },
    });
  } catch (err) {
    logger.error('Erro no login', { error: err.message });
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('sigpol_rt', { path: '/api/v1/auth' });
  res.json({ mensagem: 'Sessão encerrada com sucesso' });
};

/**
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res) => {
  const refresh_token = req.cookies?.sigpol_rt;
  if (!refresh_token) {
    return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }

  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_SECRET);
    const { rows } = await query(
      `SELECT u.id, u.login, u.perfil, u.ativo, p.id_unidade
       FROM usuarios u
       LEFT JOIN policiais p ON p.id = u.id_policial
       WHERE u.id = $1`,
      [decoded.id]
    );

    const usuario = rows[0];
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Token inválido' });
    }

    const novoToken = jwt.sign(
      { id: usuario.id, login: usuario.login, perfil: usuario.perfil, unidade: usuario.id_unidade },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ token: novoToken });
  } catch {
    res.status(401).json({ erro: 'refresh_token inválido ou expirado' });
  }
};

/**
 * GET /api/v1/auth/me
 */
const me = async (req, res) => {
  res.json({ usuario: req.usuario });
};

module.exports = { login, logout, refreshToken, me };
