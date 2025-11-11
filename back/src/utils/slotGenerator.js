// file: src/utils/slotGenerator.js
const { isISODate, isHHmm } = require('./dates');

function pad(x) { return String(x).padStart(2, '0'); }

/**
 * Gera slots contíguos no dia informado, respeitando almoço 12:00-13:00 (UTC)
 * @param {string} dateISO - "YYYY-MM-DD"
 * @param {string} startTime - "HH:mm" (ex: "07:00")
 * @param {string} endTime - "HH:mm" (ex: "18:00")
 * @param {number} durationMin - duração de cada consulta, em minutos (ex: 45)
 * @returns {Array<{start: Date, end: Date}>}
 */
function generateDailySlots({ dateISO, startTime, endTime, durationMin }) {
  if (!isISODate(dateISO)) throw new Error('date inválida (YYYY-MM-DD)');
  if (!isHHmm(startTime) || !isHHmm(endTime)) throw new Error('Horários inválidos (HH:mm)');

  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);

  const startDay = new Date(`${dateISO}T${pad(sH)}:${pad(sM)}:00.000Z`);
  const endDay   = new Date(`${dateISO}T${pad(eH)}:${pad(eM)}:00.000Z`);

  if (!(startDay < endDay)) throw new Error('Intervalo de dia inválido');
  if (!Number.isFinite(durationMin) || durationMin <= 0) throw new Error('durationMin inválido');

  // Almoço fixo 12:00 -> 13:00
  const lunchStart = new Date(`${dateISO}T12:00:00.000Z`);
  const lunchEnd   = new Date(`${dateISO}T13:00:00.000Z`);

  const segments = [
    { from: startDay, to: new Date(Math.min(endDay.getTime(), lunchStart.getTime())) },
    { from: new Date(Math.max(lunchEnd.getTime(), startDay.getTime())), to: endDay }
  ].filter(seg => seg.from < seg.to);

  const res = [];
  for (const { from, to } of segments) {
    let cursor = new Date(from);
    while (true) {
      const end = new Date(cursor.getTime() + durationMin * 60 * 1000);
      if (end > to) break;
      res.push({ start: new Date(cursor), end });
      cursor = end;
    }
  }
  return res;
}

module.exports = { generateDailySlots };
