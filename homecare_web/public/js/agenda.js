// public/js/agenda.js
(function () {
  const ptMonths = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const $monthTitle = document.getElementById('monthTitle');
  const $calendarDays = document.getElementById('calendarDays');
  const $dateTitle = document.getElementById('agendaData');
  const $listaConf = document.getElementById('listaConfirmadas');
  const $listaPend = document.getElementById('listaPendentes');
  const $listaDisp = document.getElementById('listaDisponiveis');

  const $prev = document.getElementById('prevMonth');
  const $next = document.getElementById('nextMonth');
  const $today = document.getElementById('todayBtn');
  const $btnDisp = document.getElementById('btnDisponibilizar');
  const $menuDisp = document.getElementById('menuDisponibilizar');

  // Modal root
  let $modalRoot = document.querySelector('.modal-root');
  if (!$modalRoot) {
    $modalRoot = document.createElement('div');
    $modalRoot.className = 'modal-root';
    $modalRoot.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal-slot"></div>
    `;
    document.body.appendChild($modalRoot);
  }
  const $modalSlot = $modalRoot.querySelector('.modal-slot');

  const medicos = (window.AGENDA_MEDICOS || []);
  let viewYear, viewMonth;
  let selectedDate = new Date();

  // Estado carregado da API
  let doctorId = medicos[0]?.id || null;
  let availability = [];
  let appointments = [];

  // Index para lookup rápido nos botões Detalhe/Confirmar
  const indexAvail = new Map();
  const indexAppt  = new Map();

  function pad(n){ return String(n).padStart(2,'0'); }
  function toKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function formatDateLong(d){ return `${pad(d.getDate())} de ${ptMonths[d.getMonth()]}`; }

  function toUtcHM(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }
  function formatRangeUTC(startsAt, endsAt){
    return `${toUtcHM(startsAt)} – ${toUtcHM(endsAt)}`;
  }

  // ===== seletor de médico no topo
  injectDoctorSelect();
  function injectDoctorSelect(){
    const actions = document.querySelector('.agenda-actions');
    if (!actions || !medicos.length) return;
    const wrap = document.createElement('div');
    wrap.style.display = 'inline-flex';
    wrap.style.gap = '8px';
    wrap.style.alignItems = 'center';
    wrap.style.marginRight = '8px';

    const select = document.createElement('select');
    select.className = 'select';
    select.innerHTML = medicos.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
    select.value = doctorId || medicos[0].id;

    select.addEventListener('change', async () => {
      // ★ garante número
      doctorId = Number.parseInt(select.value, 10);
      await loadMonthData();
      renderMonth(viewYear, viewMonth);
      renderPainel(selectedDate);
    });

    wrap.appendChild(select);
    actions.prepend(wrap);
  }

  async function loadMonthData(){
    if (!doctorId) return;

    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59, 999);

    const from = first.toISOString();
    const to = last.toISOString();

    // ★ envia como string no QS, mas doctorId está consistente como número
    const qs = new URLSearchParams({ doctorId: String(doctorId), from, to }).toString();
    const r = await fetch(`/agenda/data?${qs}`);
    if (!r.ok) { availability = []; appointments = []; return; }
    const data = await r.json();
    availability = Array.isArray(data.availability) ? data.availability : [];
    appointments = Array.isArray(data.appointments) ? data.appointments : [];

    indexAvail.clear(); availability.forEach(a => indexAvail.set(String(a.id), a));
    indexAppt.clear();  appointments.forEach(a => indexAppt.set(String(a.id), a));
  }

  function setSelected(d){
    selectedDate = new Date(d.getTime());
    $dateTitle.textContent = formatDateLong(selectedDate);
    renderPainel(selectedDate);
    document.querySelectorAll('.day').forEach(el => el.classList.toggle('is-selected', el.dataset.key === toKey(selectedDate)));
  }

  function renderMonth(y, m){
    viewYear = y; viewMonth = m;
    $monthTitle.textContent = `${ptMonths[m]} ${y}`;

    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    const cells = [];
    for (let i=0;i<42;i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toKey(d);

      const dayAppointments = appointments.filter(a => toKey(new Date(a.startsAt)) === key);
      const conf = dayAppointments.filter(a => a.status === 'CONFIRMED').length;
      const pend = dayAppointments.filter(a => a.status === 'PENDING').length;
      const disp = availability.filter(av => toKey(new Date(av.startsAt)) === key && av.isBooked === false).length;

      const isOther = d.getMonth() !== m;
      const isToday = key === toKey(new Date());

      cells.push(`
        <div class="day ${isOther?'is-other':''} ${isToday?'is-today':''}" data-key="${key}">
          <div class="num">${d.getDate()}</div>
          <div class="badges">
            ${conf ? `<span class="badge confirmed">${conf} conf.</span>` : ''}
            ${pend ? `<span class="badge pending">${pend} pend.</span>` : ''}
            ${disp ? `<span class="badge">${disp} disp.</span>` : ''}
          </div>
        </div>
      `);
    }
    $calendarDays.innerHTML = cells.join('');

    $calendarDays.querySelectorAll('.day').forEach(el => {
      el.addEventListener('click', () => {
        const [yy,mm,dd] = el.dataset.key.split('-').map(Number);
        setSelected(new Date(yy, mm-1, dd));
      });
    });

    const keySel = toKey(selectedDate);
    const match = $calendarDays.querySelector(`.day[data-key="${keySel}"]`);
    if (match) match.classList.add('is-selected');
  }

  function renderPainel(d){
    const key = toKey(d);
    const dayAppointments = appointments.filter(a => toKey(new Date(a.startsAt)) === key);
    const conf = dayAppointments.filter(a => a.status === 'CONFIRMED');
    const pend = dayAppointments.filter(a => a.status === 'PENDING');
    const disp = availability.filter(av => toKey(new Date(av.startsAt)) === key && av.isBooked === false);

    function renderList(list, target, kind){
      if (!list.length){
        target.classList.add('empty');
        target.innerHTML = `<li class="empty-msg">—</li>`;
        return;
      }
      target.classList.remove('empty');
      target.innerHTML = list.map(item => {
        const hour = toUtcHM(item.startsAt);
        const who = item.patient?.name
          ? `${item.patient.name} <small>(${item.doctor?.name || ''})</small>`
          : 'Horário disponível';
        const addr = item.notes ? `<div class="addr">${(item.notes+'').replace(/\n/g,'<br>')}</div>` : '';
        const id = item.id;
        const type = item.patient ? (item.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING') : 'AVAILABLE';
        return `
          <li class="appt-item" data-type="${type}" data-id="${id}">
            <span class="status-dot ${kind==='ok'?'ok':kind==='warn'?'warn':'info'}"></span>
            <div class="top">
              <span class="who">${who}</span>
              <span class="hour">${hour}</span>
            </div>
            ${addr}
            <div class="actions">
              <button class="btn btn--sm btn-detail">Detalhe</button>
              ${type==='PENDING' ? '<button class="btn btn--sm btn--pastel btn-confirm" style="margin-left:8px">Confirmar</button>' : ''}
            </div>
          </li>
        `;
      }).join('');
    }

    renderList(conf, $listaConf, 'ok');
    renderList(pend, $listaPend, 'warn');
    renderList(disp, $listaDisp, 'info');
  }

  document.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.appt-item');
    if (!itemEl) return;

    const id = itemEl.dataset.id;
    const type = itemEl.dataset.type;

    if (e.target.classList.contains('btn-detail')) {
      openDetail(type, id);
    }
    if (e.target.classList.contains('btn-confirm')) {
      confirmPending(id, e.target);
    }
  });

  function getDoctorNameById(id){
    const m = medicos.find(x => String(x.id) === String(id));
    return m?.nome || '';
  }

  function openDetail(type, id){
    let title = 'Detalhes';
    let html = '';

    if (type === 'AVAILABLE') {
      const slot = indexAvail.get(String(id));
      if (!slot) return;
      title = `Detalhes do horário – ${formatDateLong(new Date(slot.startsAt))}`;
      html = `
        <div class="detail-list">
          <div class="row"><div class="label">Início</div><div class="value">${toUtcHM(slot.startsAt)}</div></div>
          <div class="row"><div class="label">Fim</div><div class="value">${toUtcHM(slot.endsAt)}</div></div>
          <div class="row"><div class="label">Médico</div><div class="value">${getDoctorNameById(slot.doctorId ?? doctorId)}</div></div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" data-close>Voltar</button>
        </div>
      `;
    } else {
      const appt = indexAppt.get(String(id));
      if (!appt) return;
      title = `Detalhes da consulta – ${formatDateLong(new Date(appt.startsAt))}`;

      const address = appt.patientAddressFull || 'Endereço não informado';

      html = `
        <div class="detail-list">
          <div class="row"><div class="label">Início</div><div class="value">${toUtcHM(appt.startsAt)}</div></div>
          <div class="row"><div class="label">Fim</div><div class="value">${toUtcHM(appt.endsAt)}</div></div>
          <div class="row"><div class="label">Médico</div><div class="value">${appt.doctor?.name || getDoctorNameById(doctorId)}</div></div>
          <div class="row"><div class="label">Paciente</div><div class="value">${appt.patient?.name || '-'}</div></div>
          ${appt.notes ? `<div class="row"><div class="label">Serviço</div><div class="value">${(appt.notes+'').replace(/\n/g,'<br>')}</div></div>` : ''}
          <div class="row"><div class="label">Endereço</div><div class="value">${address}</div></div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn--ghost" data-close>Voltar</button>
          ${appt.status === 'PENDING' ? '<button type="button" class="btn btn--pastel" data-confirm-appt="'+appt.id+'">Confirmar</button>' : ''}
        </div>
      `;
    }

    showCustomModal(title, html);

    const btn = document.querySelector('[data-confirm-appt]');
    if (btn) {
      btn.addEventListener('click', () => {
        const apptId = btn.getAttribute('data-confirm-appt');
        confirmPending(apptId, btn);
      });
    }
  }

  function showCustomModal(title, innerHtml){
    $modalSlot.innerHTML = `
      <div class="modal">
        <div class="modal__card">
          <h2 class="modal__title">${title}</h2>
          ${innerHtml}
        </div>
      </div>
    `;
    $modalRoot.classList.add('is-open');
    $modalRoot.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    $modalRoot.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  }

  function closeModal(){
    $modalRoot.classList.remove('is-open');
    $modalSlot.innerHTML = '';
  }

  // ====== DISPONIBILIZAR AGENDA ======

  function toggleMenu(show){ $menuDisp.setAttribute('aria-hidden', show ? 'false' : 'true'); }
  toggleMenu(false);
  $btnDisp.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = $menuDisp.getAttribute('aria-hidden') !== 'false';
    toggleMenu(isHidden);
  });
  document.addEventListener('click', () => toggleMenu(false));

  $menuDisp.addEventListener('click', (e) => {
    const el = e.target.closest('.dropdown__item');
    if (!el) return;
    const action = el.dataset.action;
    toggleMenu(false);
    if (action === 'especifica') openDisponibilizarEspecifica();
    if (action === 'lote')       openDisponibilizarLote();
  });

  function openDisponibilizarEspecifica(){
    const tpl = document.getElementById('tplModalEspecifica');
    if (!tpl) return;
    $modalSlot.innerHTML = tpl.innerHTML;

    const $modal = $modalSlot.querySelector('.modal');
    const $dateEl = $modal.querySelector('.modal__date');
    const $form = $modal.querySelector('form');

    $dateEl.textContent = formatDateLong(selectedDate);

    $modalRoot.classList.add('is-open');
    $modalRoot.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeModal));
    $modalRoot.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    $form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData($form);
      const inicio = fd.get('inicio');
      const fim    = fd.get('fim');

      const dateKey = toKey(selectedDate); // YYYY-MM-DD
      // ★ monta payload e só inclui doctorId se válido
      const payload = {
        startsAt: `${dateKey}T${inicio}:00.000Z`,
        endsAt:   `${dateKey}T${fim}:00.000Z`
      };
      if (Number.isInteger(doctorId) && doctorId > 0) {
        payload.doctorId = doctorId;
      }

      try {
        await fetchJson('/agenda/availability', 'POST', payload);
        toast('Horário disponibilizado.');
        closeModal();
        await onMonthChange(new Date(viewYear, viewMonth, 1));
      } catch (e) {
        console.error(e);
        toast('Não foi possível disponibilizar.', true);
      }
    });
  }

  function openDisponibilizarLote(){
    const tpl = document.getElementById('tplModalLote');
    if (!tpl) return;
    $modalSlot.innerHTML = tpl.innerHTML;

    const $modal = $modalSlot.querySelector('.modal');
    const $dateEl = $modal.querySelector('.modal__date');
    const $form = $modal.querySelector('form');

    $dateEl.textContent = formatDateLong(selectedDate);

    $modalRoot.classList.add('is-open');
    $modalRoot.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeModal));
    $modalRoot.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    $form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData($form);
      const inicioDia = fd.get('inicioDia');
      const fimDia    = fd.get('fimDia');
      const intervalo = Number(fd.get('intervalo'));

      const dateKey = toKey(selectedDate); // YYYY-MM-DD

      // ★ idem: inclui doctorId só se válido
      const payload = {
        date: dateKey,
        startTime: inicioDia,
        endTime: fimDia,
        durationMin: intervalo
      };
      if (Number.isInteger(doctorId) && doctorId > 0) {
        payload.doctorId = doctorId;
      }

      try {
        const resp = await fetchJson('/agenda/availability/day-openings', 'POST', payload);
        const qnt = typeof resp?.created === 'number' ? resp.created : (resp?.generated ?? 0);
        toast(`Gerados ${qnt} horários.`);
        closeModal();
        await onMonthChange(new Date(viewYear, viewMonth, 1));
      } catch (e) {
        console.error(e);
        toast('Não foi possível gerar os horários.', true);
      }
    });
  }

  async function fetchJson(url, method = 'GET', body) {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) {
      let msg = 'erro';
      try { const d = await r.json(); msg = d?.error || msg; } catch {}
      throw new Error(msg);
    }
    return r.json();
  }

  async function confirmPending(id, btn){
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Confirmando...';
      }
      await fetch(`/agenda/appointments/${id}/confirm`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });
      const first = new Date(viewYear, viewMonth, 1);
      await onMonthChange(first);
      if ($modalRoot.classList.contains('is-open')) closeModal();
      toast('Consulta confirmada com sucesso.');
    } catch (e) {
      console.error(e);
      toast('Não foi possível confirmar a consulta.', true);
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; }
    }
  }

  function toast(msg, isErr=false){
    let el = document.querySelector('.toast');
    if (!el){
      el = document.createElement('div');
      el.className = 'toast';
      Object.assign(el.style, {
        position:'fixed', bottom:'16px', left:'50%', transform:'translateX(-50%)',
        background:'#1f2d3d', color:'#fff', padding:'10px 14px', borderRadius:'10px',
        zIndex:'9999', boxShadow:'0 6px 18px rgba(0,0,0,.2)', fontSize:'14px'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = isErr ? '#b3261e' : '#1f2d3d';
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(()=>{ el.style.display='none'; }, 2200);
  }

  $prev?.addEventListener('click', async () => {
    const d = new Date(viewYear, viewMonth-1, 1);
    await onMonthChange(d);
  });
  $next?.addEventListener('click', async () => {
    const d = new Date(viewYear, viewMonth+1, 1);
    await onMonthChange(d);
  });
  $today?.addEventListener('click', async () => {
    const now = new Date();
    setSelected(now);
    await onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  });

  async function onMonthChange(firstOfMonth){
    renderMonth(firstOfMonth.getFullYear(), firstOfMonth.getMonth());
    await loadMonthData();
    renderMonth(viewYear, viewMonth);
    renderPainel(selectedDate);
  }

  const now = new Date();
  setSelected(now);
  renderMonth(now.getFullYear(), now.getMonth());
  loadMonthData().then(() => {
    renderMonth(viewYear, viewMonth);
    renderPainel(selectedDate);
  });
})();
