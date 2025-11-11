const { models: { AuditLog } } = require('../db');

function getIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim())
    || req.ip
    || req.connection?.remoteAddress
    || null;
}

async function logAction(req, { action, entityType = null, entityId = null, meta = null }) {
  try {
    const actorUserId = req.user?.id || null;
    const actorRole = req.user?.role || null;
    const ip = getIp(req);
    const userAgent = req.headers['user-agent'] || null;

    // meta deve conter somente informações não sensíveis!
    await AuditLog.create({ actorUserId, actorRole, action, entityType, entityId, meta, ip, userAgent });
  } catch (e) {
    // não derruba a requisição por falha de log
    console.error('Falha ao gravar audit log:', e.message);
  }
}

module.exports = { logAction };
