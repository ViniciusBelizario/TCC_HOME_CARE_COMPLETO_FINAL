(function () {
  const cfgEl = document.getElementById('relatorio-config');
  const BASE = (cfgEl?.dataset.baseurl || '').replace(/\/$/, '');
  const TOKEN = cfgEl?.dataset.token || '';

  const dom = {
    from: document.getElementById('from'),
    to: document.getElementById('to'),
    doctorId: document.getElementById('doctorId'),
    aplicar: document.getElementById('btn-aplicar'),

    // KPIs
    kpi: {
      total: document.getElementById('kpi-total'),
      requested: document.getElementById('kpi-requested'),
      accepted: document.getElementById('kpi-accepted'),
      denied: document.getElementById('kpi-denied'),
      canceled: document.getElementById('kpi-canceled'),
      completed: document.getElementById('kpi-completed'),
      avg: document.getElementById('kpi-avgDuration'),
      util: document.getElementById('kpi-utilRate'),
    },

    // Charts
    chartAggCanvas: document.getElementById('chart-aggregate'),
    chartUtilCanvas: document.getElementById('chart-utilization'),

    // Tables
    tAggBody: document.querySelector('#table-aggregate tbody'),
    tUtilBody: document.querySelector('#table-utilization tbody'),
    tDetBody: document.querySelector('#table-detailed tbody'),

    // CSV buttons
    csvAgg: document.getElementById('csv-aggregate'),
    csvUtil: document.getElementById('csv-utilization'),
    csvDet: document.getElementById('csv-detailed'),
  };

  // Estado
  let aggData = [];        // /reports/appointments/aggregate
  let utilData = [];       // /reports/doctors/utilization
  let detData = [];        // /reports/appointments/detailed
  let chartAgg = null;
  let chartUtil = null;

  // Helpers
  const headers = TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {};

  function toIsoRange(dateStr, endOfDay = false) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    if (endOfDay) {
      d.setHours(23, 59, 59, 999);
    }
    return d.toISOString();
  }

  function fmtPct(x) {
    if (x === null || x === undefined) return '-';
    return (x * 100).toFixed(0) + '%';
  }

  function fmtNum(x) {
    if (x === null || x === undefined) return '-';
    return String(x);
  }

  function downloadCSV(filename, rows) {
    const csv = [
      rows[0].map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.slice(1).map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    link.remove();
  }

  function setDateDefaults() {
    // Últimos 30 dias
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 29);

    dom.from.value = from.toISOString().substring(0, 10);
    dom.to.value = now.toISOString().substring(0, 10);
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${res.status}: ${t || res.statusText}`);
    }
    return res.json();
  }

  function buildQuery(base, params) {
    const u = new URL(base);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
    });
    return u.toString();
  }

  async function loadKPIs(fromISO, toISO) {
    const url = buildQuery(`${BASE}/reports/kpis`, { from: fromISO, to: toISO });
    const data = await fetchJSON(url);

    dom.kpi.total.textContent     = fmtNum(data.total);
    dom.kpi.requested.textContent = fmtNum(data.requested);
    dom.kpi.accepted.textContent  = fmtNum(data.accepted);
    dom.kpi.denied.textContent    = fmtNum(data.denied);
    dom.kpi.canceled.textContent  = fmtNum(data.canceled);
    dom.kpi.completed.textContent = fmtNum(data.completed);
    dom.kpi.avg.textContent       = fmtNum(data.avgDurationMin);
    dom.kpi.util.textContent      = fmtPct(data.utilizationRate);
  }

  async function loadAggregate(fromISO, toISO, doctorId) {
    const url = buildQuery(`${BASE}/reports/appointments/aggregate`, {
      from: fromISO,
      to: toISO,
      doctorId: doctorId || undefined,
      format: 'json',
    });
    const data = await fetchJSON(url);
    aggData = Array.isArray(data) ? data : [];
    renderAggTable();
    renderAggChart();
  }

  async function loadUtilization(fromISO, toISO) {
    const url = buildQuery(`${BASE}/reports/doctors/utilization`, {
      from: fromISO,
      to: toISO,
      format: 'json',
    });
    const data = await fetchJSON(url);
    utilData = Array.isArray(data) ? data : [];
    populateDoctorSelect(utilData);
    renderUtilTable();
    renderUtilChart();
  }

  async function loadDetailed(fromISO, toISO, doctorId) {
    const url = buildQuery(`${BASE}/reports/appointments/detailed`, {
      from: fromISO,
      to: toISO,
      doctorId: doctorId || undefined,
      format: 'json',
    });
    const data = await fetchJSON(url);
    detData = Array.isArray(data) ? data : [];
    renderDetTable();
  }

  function populateDoctorSelect(utilList) {
    // Evita duplicar opções
    const existing = new Set(Array.from(dom.doctorId.options).map(o => o.value));
    utilList.forEach(item => {
      const id = String(item.doctorId ?? '');
      if (!id || existing.has(id)) return;
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = item.doctor || `#${id}`;
      dom.doctorId.appendChild(opt);
      existing.add(id);
    });
  }

  function renderAggTable() {
    dom.tAggBody.innerHTML = '';
    const frag = document.createDocumentFragment();

    aggData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.period || '-'}</td>
        <td>${row.doctor || '-'}</td>
        <td>${fmtNum(row.requested)}</td>
        <td>${fmtNum(row.accepted)}</td>
        <td>${fmtNum(row.denied)}</td>
        <td>${fmtNum(row.canceled)}</td>
        <td>${fmtNum(row.completed)}</td>
        <td>${fmtNum(row.total)}</td>
        <td>${fmtNum(row.avgDurationMin)}</td>
        <td>${fmtNum(row.completionRate)}</td>
      `;
      frag.appendChild(tr);
    });

    dom.tAggBody.appendChild(frag);
  }

  function renderUtilTable() {
    dom.tUtilBody.innerHTML = '';
    const frag = document.createDocumentFragment();

    utilData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.doctor || '-'}</td>
        <td>${fmtNum(row.appointments)}</td>
        <td>${fmtNum(row.minutesBookedByAppt)}</td>
        <td>${fmtNum(row.minutesAvailable)}</td>
        <td>${fmtNum(row.minutesBookedBySlots)}</td>
        <td>${fmtPct(row.utilizationRate)}</td>
        <td>${fmtNum(row.avgApptsPerDay)}</td>
      `;
      frag.appendChild(tr);
    });

    dom.tUtilBody.appendChild(frag);
  }

  function renderDetTable() {
    dom.tDetBody.innerHTML = '';
    const frag = document.createDocumentFragment();

    detData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.doctor || '-'}</td>
        <td>${fmtNum(row.requested)}</td>
        <td>${fmtNum(row.accepted)}</td>
        <td>${fmtNum(row.denied)}</td>
        <td>${fmtNum(row.canceled)}</td>
        <td>${fmtNum(row.completed)}</td>
        <td>${fmtNum(row.total)}</td>
      `;
      frag.appendChild(tr);
    });

    dom.tDetBody.appendChild(frag);
  }

  function renderAggChart() {
    const labels = aggData.map(r => r.period);
    const totals = aggData.map(r => r.total);
    const accepted = aggData.map(r => r.accepted || 0);
    const canceled = aggData.map(r => r.canceled || 0);

    if (chartAgg) chartAgg.destroy();
    chartAgg = new Chart(dom.chartAggCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Total', data: totals },
          { label: 'Aceitas', data: accepted },
          { label: 'Canceladas', data: canceled },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { ticks: { autoSkip: true } }, y: { beginAtZero: true } },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  function renderUtilChart() {
    const labels = utilData.map(r => r.doctor || `#${r.doctorId}`);
    const util = utilData.map(r => Math.round((r.utilizationRate || 0) * 100));

    if (chartUtil) chartUtil.destroy();
    chartUtil = new Chart(dom.chartUtilCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Utilização (%)', data: util }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // CSV buttons
  dom.csvAgg.addEventListener('click', () => {
    const rows = [
      ['period','doctorId','doctor','requested','accepted','denied','canceled','completed','total','avgDurationMin','completionRate']
    ];
    aggData.forEach(r => {
      rows.push([
        r.period, r.doctorId, r.doctor, r.requested, r.accepted, r.denied,
        r.canceled, r.completed, r.total, r.avgDurationMin, r.completionRate
      ]);
    });
    downloadCSV('consultas_por_dia.csv', rows);
  });

  dom.csvUtil.addEventListener('click', () => {
    const rows = [
      ['doctorId','doctor','appointments','minutesBookedByAppt','minutesAvailable','minutesBookedBySlots','utilizationRate','avgApptsPerDay']
    ];
    utilData.forEach(r => {
      rows.push([
        r.doctorId, r.doctor, r.appointments, r.minutesBookedByAppt, r.minutesAvailable,
        r.minutesBookedBySlots, r.utilizationRate, r.avgApptsPerDay
      ]);
    });
    downloadCSV('utilizacao_por_medico.csv', rows);
  });

  dom.csvDet.addEventListener('click', () => {
    const rows = [
      ['doctorId','doctor','requested','accepted','denied','canceled','completed','total']
    ];
    detData.forEach(r => {
      rows.push([
        r.doctorId, r.doctor, r.requested, r.accepted, r.denied, r.canceled, r.completed, r.total
      ]);
    });
    downloadCSV('consultas_detalhado.csv', rows);
  });

  // Buscar tudo
  async function runQuery() {
    try {
      const fromISO = toIsoRange(dom.from.value, false);
      const toISO = toIsoRange(dom.to.value, true);
      const doctorId = dom.doctorId.value;

      if (!fromISO || !toISO) throw new Error('Selecione o período.');

      // Dispara em paralelo
      await Promise.all([
        loadKPIs(fromISO, toISO),
        loadAggregate(fromISO, toISO, doctorId),
        loadUtilization(fromISO, toISO),
        loadDetailed(fromISO, toISO, doctorId),
      ]);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      alert('Erro ao carregar relatórios: ' + err.message);
    }
  }

  dom.aplicar.addEventListener('click', runQuery);

  // init
  setDateDefaults();
  runQuery();
})();
