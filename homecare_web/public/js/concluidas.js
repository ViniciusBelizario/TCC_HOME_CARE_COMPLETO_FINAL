// public/js/concluidas.js
(function(){
  const $list = document.getElementById('cc-list');
  const $empty = document.getElementById('cc-empty');
  const $q = document.getElementById('cc-q');
  const $btnSearch = document.getElementById('cc-search-btn');
  const $btnClear = document.getElementById('cc-clear-btn');

  // modal infra (idêntico ao restante do sistema)
  const $root = document.querySelector('.modal-root');
  const $slot = $root.querySelector('.modal-slot');
  function openModal(html){
    $slot.innerHTML = html;
    $root.classList.add('is-open');
    $root.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    $root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  }
  function closeModal(){
    $root.classList.remove('is-open');
    $slot.innerHTML = '';
  }

  // toast padrão
  function toast(msg, err=false){
    const stack = document.getElementById('toast-stack') || (()=>{ const d=document.createElement('div'); d.id='toast-stack'; d.className='toast-stack'; document.body.appendChild(d); return d; })();
    const el = document.createElement('div');
    el.className = 'toast' + (err?' err':'');
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(()=>el.remove(), 3000);
  }

  function pad(n){ return String(n).padStart(2,'0'); }
  function dmyhm(iso){
    const d = new Date(iso);
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  async function load(){
    try{
      const q = $q.value.trim();
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      const r = await fetch(`/consultas-concluidas/data${qs}`, { headers:{ 'Accept':'application/json' }});
      if (!r.ok) throw new Error('load_error');
      const { items=[] } = await r.json();
      render(items);
    }catch(e){
      console.error(e);
      toast('Falha ao carregar concluídas.', true);
    }
  }

  function render(items){
    if (!items.length){
      $list.innerHTML = '';
      $empty.style.display = 'block';
      return;
    }
    $empty.style.display = 'none';
    $list.innerHTML = items.map(it => {
      const title = `${esc(it.patient?.name || '-')}`;
      const sub = `${dmyhm(it.startsAt)} — ${esc(it.doctor?.name || '')}`;
      const address = esc(it.patientAddressFull || '-');
      const obs = it.appointmentObservations?.length ? '• Com observações' : '';
      return `
        <article class="cc-item" data-id="${it.id}">
          <div class="cc-item__main">
            <h3 class="cc-title">${title}</h3>
            <div class="cc-sub">${sub}</div>
            <div class="cc-addr">${address}</div>
            <div class="cc-flags">${obs}</div>
          </div>
          <div class="cc-item__actions">
            <button class="btn btn--sm btn-detail">Detalhes</button>
          </div>
        </article>
      `;
    }).join('');
  }

  // Detalhes somente leitura
  document.addEventListener('click', (ev)=>{
    const el = ev.target.closest('.cc-item');
    if (!el) return;
    if (ev.target.classList.contains('btn-detail')){
      const id = Number(el.dataset.id);
      openDetailFromDom(id, el);
    }
  });

  function openDetailFromDom(id, elCard){
    // pega conteúdo já renderizado pra montar o modal
    const title = elCard.querySelector('.cc-title')?.textContent || '';
    const sub = elCard.querySelector('.cc-sub')?.textContent || '';
    const addr = elCard.querySelector('.cc-addr')?.textContent || '-';

    const html = `
      <div class="modal">
        <div class="modal__card" style="max-width:780px">
          <h2 class="modal__title">Detalhes da consulta</h2>
          <div class="detail-grid">
            <div class="label">Paciente</div><div class="value">${esc(title)}</div>
            <div class="label">Quando</div><div class="value">${esc(sub)}</div>
            <div class="label">Endereço</div><div class="value">${esc(addr)}</div>
          </div>

          <div class="split">
            <section class="box">
              <h3>Observações da consulta</h3>
              <div class="obs-list" id="cc-obs-list">Carregando...</div>
            </section>
            <section class="box">
              <h3>Observação do paciente</h3>
              <div class="obs-single" id="cc-obs-paciente">Carregando...</div>
            </section>
          </div>

          <div class="modal__footer">
            <button class="btn btn--ghost" data-close>Fechar</button>
          </div>
        </div>
      </div>
    `;
    openModal(html);

    // carrega dados frescos (aproveita o endpoint de lista já carregado com/sem q)
    fetch(`/consultas-concluidas/data${$q.value.trim() ? `?q=${encodeURIComponent($q.value.trim())}`:''}`, { headers:{ 'Accept':'application/json' }})
      .then(r=>r.json())
      .then(({items=[]})=>{
        const found = items.find(x => Number(x.id) === id);
        if (!found) return;
        renderObs(found);
      })
      .catch(()=>{ /* silencioso */ });
  }

  function renderObs(item){
    const boxList = document.getElementById('cc-obs-list');
    const boxPatient = document.getElementById('cc-obs-paciente');

    const arr = Array.isArray(item.appointmentObservations) ? item.appointmentObservations : [];
    if (!arr.length){
      boxList.innerHTML = `<div class="muted">Sem observações nesta consulta.</div>`;
    } else {
      boxList.innerHTML = arr.map(o => `
        <div class="obs-card">
          <div class="obs-head">
            <strong>${esc(o?.doctor?.name || '—')}</strong>
            <span>${o?.createdAt ? dmyhm(o.createdAt) : ''}</span>
          </div>
          <div class="obs-note">${esc(o?.note || '')}</div>
        </div>
      `).join('');
    }

    const p = item.patientObservation;
    if (!p || !p.note){
      boxPatient.innerHTML = `<div class="muted">Sem observação registrada para o paciente.</div>`;
    } else {
      boxPatient.innerHTML = `
        <div class="obs-card">
          <div class="obs-head">
            <strong>${esc(p?.doctor?.name || '—')}</strong>
            <span>${p?.createdAt ? dmyhm(p.createdAt) : ''}</span>
          </div>
          <div class="obs-note">${esc(p.note)}</div>
        </div>
      `;
    }
  }

  // eventos busca
  $btnSearch.addEventListener('click', load);
  $btnClear.addEventListener('click', ()=>{ $q.value=''; load(); });
  $q.addEventListener('keydown', (e)=>{ if (e.key==='Enter') load(); });

  load();
})();
