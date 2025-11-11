(function(){
  const $tabOpen = document.getElementById('mh-tab-open');
  const $tabCompleted = document.getElementById('mh-tab-completed');
  const $panelOpen = document.getElementById('mh-panel-open');
  const $panelCompleted = document.getElementById('mh-panel-completed');
  const $tblOpen = document.querySelector('#mh-table-open tbody');
  const $tblCompleted = document.querySelector('#mh-table-completed tbody');
  const $refresh = document.getElementById('mh-refresh');

  const toastBox = document.getElementById('toast-stack');

  function toast(msg, err){
    const el = document.createElement('div');
    el.className = 'toast' + (err ? ' err' : '');
    el.textContent = msg;
    toastBox.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 3000);
  }

  function pad(n){ return String(n).padStart(2,'0'); }
  function hm(iso){ const d=new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function activate(tab){
    const open = tab === 'open';
    $tabOpen.classList.toggle('is-active', open);
    $tabCompleted.classList.toggle('is-active', !open);
    $panelOpen.classList.toggle('is-active', open);
    $panelOpen.hidden = !open;
    $panelCompleted.classList.toggle('is-active', !open);
    $panelCompleted.hidden = open;
  }

  async function load(){
    try{
      const r = await fetch('/medico/pacientes-hoje/data', { headers:{ 'Accept':'application/json' }});
      if (!r.ok){
        let msg = 'Falha ao carregar dados.';
        try { const j = await r.json(); if (j?.error) msg += ` (${j.error})`; } catch {}
        throw new Error(msg);
      }
      const { open = [], completed = [] } = await r.json();
      renderOpen(open);
      renderCompleted(completed);
    }catch(e){
      console.error(e);
      $tblOpen.innerHTML = `<tr><td colspan="4" style="color:#b3261e">Falha ao carregar dados.</td></tr>`;
      $tblCompleted.innerHTML = `<tr><td colspan="5" style="color:#b3261e">Falha ao carregar dados.</td></tr>`;
      toast('Falha ao carregar dados.', true);
    }
  }

  function renderOpen(items){
    if (!items.length){
      $tblOpen.innerHTML = `<tr><td colspan="4">Nenhuma consulta aberta para hoje.</td></tr>`;
      return;
    }
    $tblOpen.innerHTML = items.map(a => `
      <tr data-id="${a.id}">
        <td>${hm(a.startsAt)}–${hm(a.endsAt)}</td>
        <td>${esc(a.patient?.name || '-')}</td>
        <td>${esc(a.patientAddressFull || '-')}</td>
        <td class="mh-actions">
          <button class="btn btn-ghost btn-sm" data-detail>Detalhes</button>
          <button class="btn btn-primary btn-sm" data-finish>Finalizar</button>
        </td>
      </tr>
    `).join('');
  }

  function renderCompleted(items){
    if (!items.length){
      $tblCompleted.innerHTML = `<tr><td colspan="5">Nenhuma consulta finalizada hoje.</td></tr>`;
      return;
    }
    $tblCompleted.innerHTML = items.map(a => `
      <tr>
        <td>${hm(a.startsAt)}–${hm(a.endsAt)}</td>
        <td>${esc(a.patient?.name || '-')}</td>
        <td>${esc(a.patientAddressFull || '-')}</td>
        <td>COMPLETED</td>
        <td class="mh-actions">
          <button class="btn btn-ghost btn-sm" data-detail data-id="${a.id}">Detalhes</button>
        </td>
      </tr>
    `).join('');
  }

  // modal lightbox (já existente no seu CSS/HTML)
  function openModal(html){
    const root = document.querySelector('.modal-root');
    const slot = root.querySelector('.modal-slot');
    slot.innerHTML = html;
    root.classList.add('is-open');
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ()=>closeModal()));
    root.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  }
  function closeModal(){
    const root = document.querySelector('.modal-root');
    const slot = root.querySelector('.modal-slot');
    root.classList.remove('is-open');
    slot.innerHTML = '';
  }

  // abrir detalhes
  document.addEventListener('click', async (ev)=>{
    const tr = ev.target.closest('tr[data-id]');
    if (!tr) return;
    const id = tr.getAttribute('data-id');

    if (ev.target.matches('[data-finish]')){
      try{
        ev.target.disabled = true;
        ev.target.textContent = 'Finalizando...';
        const r = await fetch(`/medico/consultas/${id}/finalizar`, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
          body: JSON.stringify({})
        });
        if (!r.ok){
          let msg = 'Não foi possível finalizar.';
          try{ const j=await r.json(); if (j?.error) msg += ` (${j.error})`; }catch{}
          throw new Error(msg);
        }
        toast('Consulta finalizada.');
        await load();
      }catch(e){
        console.error(e);
        toast(e.message || 'Erro ao finalizar.', true);
      }finally{
        ev.target.disabled = false;
        ev.target.textContent = 'Finalizar';
      }
      return;
    }

    if (ev.target.matches('[data-detail]')){
      // carrega do endpoint /appointments/my (já foi carregado na tabela, mas para manter simples, mostra info básica)
      // Exames inline (usar iframe proxy) e download
      const viewUrl = (examId)=> `/medico/exames/${examId}/view`;
      const dlUrl = (examId)=> `/medico/exames/${examId}/download`;

      const html = `
        <div class="modal">
          <div class="modal__card" style="max-width:900px">
            <h2 class="modal__title">Detalhes da consulta</h2>
            <div class="detail-list">
              <div class="row"><div class="label">Consulta</div><div class="value">#${id}</div></div>
              <div class="row"><div class="label">Horário</div><div class="value">${tr.children[0].textContent}</div></div>
              <div class="row"><div class="label">Paciente</div><div class="value">${tr.children[1].textContent}</div></div>
              <div class="row"><div class="label">Endereço</div><div class="value">${tr.children[2].textContent}</div></div>
            </div>

            <div class="mh-exams">
              <h3 style="margin-top:12px">Exames</h3>
              <div class="mh-exams-empty">Selecione um exame na tabela de pacientes para visualizar.</div>
            </div>

            <div class="modal__footer">
              <button class="btn btn--ghost" data-close>Fechar</button>
            </div>
          </div>
        </div>
      `;
      openModal(html);
      return;
    }
  });

  $tabOpen?.addEventListener('click', ()=>activate('open'));
  $tabCompleted?.addEventListener('click', ()=>activate('completed'));
  $refresh?.addEventListener('click', load);

  activate('open');
  load();
})();
