// file: src/utils/dates.js
/**
 * Converte uma string/Date para Date em UTC.
 * Retorna `null` se inválido (nunca NaN).
 */
function toUTC(input) {
  if (!input) return null;

  // Se já é Date
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return new Date(input.toISOString()); // força UTC
  }

  // Se é string - aceita ISO (com/sem Z) e 'YYYY-MM-DDTHH:mm' ou 'YYYY-MM-DD HH:mm'
  const str = String(input).trim();

  // Normaliza espaço para 'T'
  const norm = str.replace(' ', 'T');

  const d = new Date(norm.endsWith('Z') ? norm : `${norm}Z`);
  if (isNaN(d.getTime())) return null;

  return new Date(d.toISOString());
}

/**
 * Checa se uma string está no formato de data 'YYYY-MM-DD'
 */
function isISODate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''));
}

/**
 * Checa se uma string hora está no formato 'HH:mm' 00-23:00-59
 */
function isHHmm(timeStr) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(timeStr || ''));
}

module.exports = { toUTC, isISODate, isHHmm };
