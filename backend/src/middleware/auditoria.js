// src/middleware/auditoria.js
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Registra ações importantes na tabela de auditoria
 * Uso: router.post('/rota', autenticar, registrarAuditoria('CRIAR_BO'), controller)
 */
const registrarAuditoria = (acao) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      // Só audita requisições bem-sucedidas
      if (res.statusCode >= 200 && res.statusCode < 300 && req.usuario) {
        try {
          await query(
            `INSERT INTO auditoria (id_usuario, login, ip, acao, tabela, registro_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              req.usuario.id,
              req.usuario.login,
              req.ip || req.connection.remoteAddress,
              acao,
              null,
              data?.id || data?.data?.id || null,
            ]
          );
        } catch (err) {
          logger.error('Falha ao registrar auditoria', { acao, error: err.message });
        }
      }
      return originalJson(data);
    };

    next();
  };
};

module.exports = { registrarAuditoria };
