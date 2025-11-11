const cron = require('node-cron');
const { Op } = require('sequelize');
const { loadEnv } = require('../config/env');
const { models: { AuditLog } } = require('../db');

function startLogRetentionJob() {
  const { LOG_RETENTION_DAYS, LOG_CLEAN_CRON } = loadEnv();

  cron.schedule(LOG_CLEAN_CRON, async () => {
    try {
      const cutoff = new Date(Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deleted = await AuditLog.destroy({ where: { createdAt: { [Op.lt]: cutoff } } });
      if (deleted > 0) console.log(`[Audit] Limpeza: ${deleted} logs removidos (antes de ${cutoff.toISOString()})`);
    } catch (e) {
      console.error('[Audit] Erro na limpeza de logs:', e.message);
    }
  });

  console.log(`[Audit] Retenção ativa: ${LOG_RETENTION_DAYS} dias | CRON: "${LOG_CLEAN_CRON}"`);
}

module.exports = { startLogRetentionJob };
