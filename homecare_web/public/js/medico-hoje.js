// public/js/medico-hoje.js
(function(){
  const $tabOpen = document.getElementById('mh-tab-open');
  const $tabCompleted = document.getElementById('mh-tab-completed');
  const $panelOpen = document.getElementById('mh-panel-open');
  const $panelCompleted = document.getElementById('mh-panel-completed');
  const $tblOpen = document.querySelector('#mh-table-open tbody');
  const $tblCompleted = document.querySelector('#mh-table-completed tbody');
  const $refresh = document.getElementById('mh-refresh');

  const toastBox = document.getElementById('toast-stack');

  let cacheOpen = [];
  let cacheCompleted = [];

  const obsState = { patientId:null, page:1, pageSize:10, totalPages:1 };

  function toast(msg, err){
    const el = document.createElement('div');
    el.className = 'toast' + (err ? ' err' : '');
    el.textContent = msg;
    toastBox.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 3000);
  }

  const pad = (n)=> String(n).padStart(2,'0');
  const hm = (iso)=>{ const d=new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDateTime = (iso)=>{ const d=new Date(iso); return isNaN(d) ? '—' : `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const esc = (s)=> String(s??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

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
        let msg='Falha ao carregar dados.'; try{const j=await r.json(); if(j?.error) msg+=` (${j.error})`;}catch{}
        throw new Error(msg);
      }
      const { open = [], completed = [] } = await r.json();
      cacheOpen = Array.isArray(open)?open:[];
      cacheCompleted = Array.isArray(completed)?completed:[];
      renderOpen(cacheOpen);
      renderCompleted(cacheCompleted);
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
    $tblOpen.innerHTML = items.map(a=>{
      const phone = a?.patient?.patientProfile?.phone || '-';
      const pid = a?.patient?.id ?? '';
      return `
        <tr data-id="${a.id}" data-patient-id="${pid}" data-status="open">
          <td>${hm(a.startsAt)}–${hm(a.endsAt)}</td>
          <td>${esc(a.patient?.name || '-')}</td>
          <td>${esc(phone)}</td>
          <td class="mh-actions">
            <button class="btn btn-ghost btn-sm" data-detail>Detalhes</button>
            <button class="btn btn-primary btn-sm" data-finish>Finalizar</button>
          </td>
        </tr>`;
    }).join('');
  }

  function renderCompleted(items){
    if (!items.length){
      $tblCompleted.innerHTML = `<tr><td colspan="5">Nenhuma consulta finalizada hoje.</td></tr>`;
      return;
    }
    $tblCompleted.innerHTML = items.map(a=>{
      const phone = a?.patient?.patientProfile?.phone || '-';
      const pid = a?.patient?.id ?? '';
      return `
        <tr data-id="${a.id}" data-patient-id="${pid}" data-status="completed">
          <td>${hm(a.startsAt)}–${hm(a.endsAt)}</td>
          <td>${esc(a.patient?.name || '-')}</td>
          <td>${esc(phone)}</td>
          <td>COMPLETED</td>
          <td class="mh-actions">
            <button class="btn btn-ghost btn-sm" data-detail>Detalhes</button>
          </td>
        </tr>`;
    }).join('');
  }

  // modal infra
  function openModal(html){
    const root = document.querySelector('.modal-root');
    const slot = root.querySelector('.modal-slot');
    slot.innerHTML = html;
    root.classList.add('is-open');
    root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    root.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  }
  function closeModal(){
    const root = document.querySelector('.modal-root');
    const slot = root.querySelector('.modal-slot');
    root.classList.remove('is-open');
    slot.innerHTML = '';
  }

  // seção Observações + Exames
  function buildModalContent(patient, opts = { readOnly:false }){
    const phone = patient?.patientProfile?.phone || '-';
    const readOnly = !!opts.readOnly;

    const listObservacoes = `
      <section class="obs-list-wrap">
        <div class="obs-list-top">
          <h3>Observações</h3>
          <div class="obs-pager">
            <button class="btn btn-ghost btn-sm" id="obs-prev" disabled>◀</button>
            <span id="obs-page-info">Página 1/1</span>
            <button class="btn btn-ghost btn-sm" id="obs-next" disabled>▶</button>
          </div>
        </div>
        <ul id="obs-list" class="obs-list"></ul>
      </section>`;

    const formObservacao = readOnly ? '' : `
      <section class="obs-form-wrap">
        <h3>Nova observação</h3>
        <form id="obs-form">
          <label class="obs-label" for="obs-note">Texto</label>
          <textarea id="obs-note" class="obs-textarea" rows="6" placeholder="Ex.: Paciente com melhora clínica. Retorno em 7 dias."></textarea>
          <div class="obs-form-actions">
            <span class="obs-hint">Dica: Ctrl + Enter para enviar</span>
            <button type="submit" class="btn btn-primary" id="obs-submit">Adicionar</button>
          </div>
        </form>
      </section>`;

    const statusBadge = readOnly
      ? `<div style="margin:-6px 0 6px 0;color:#6b7a90;font-size:13px">Consulta finalizada — observações somente para leitura.</div>`
      : '';

    const examsSection = `
      <section class="exams">
        <h3>Exames</h3>
        <div id="exams-list" class="exams-list">
          <div class="exams-empty">Carregando exames...</div>
        </div>
      </section>`;

    return `
      <div class="mh-obs-card">
        <h2 class="modal__title">Detalhes da consulta</h2>
        <div class="detail-list">
          <div class="row"><div class="label">Paciente</div><div class="value">${esc(patient?.name || '—')} (#${patient?.id ?? '—'})</div></div>
          <div class="row"><div class="label">Telefone</div><div class="value">${esc(phone)}</div></div>
          <div class="row"><div class="label">Atualizado</div><div class="value">${patient?.updatedAt ? fmtDateTime(patient.updatedAt) : '—'}</div></div>
        </div>
        ${statusBadge}
        <div class="obs-grid">
          ${listObservacoes}
          ${formObservacao}
        </div>
        ${examsSection}
        <div class="modal__footer">
          <button class="btn btn-ghost" data-close>Fechar</button>
        </div>
      </div>`;
  }

  async function loadObservations(patientId, page){
    const r = await fetch(`/medico/pacientes/${encodeURIComponent(patientId)}/observacoes?page=${page}&pageSize=${obsState.pageSize}`, { headers:{ 'Accept':'application/json' }});
    if(!r.ok){
      let msg='Falha ao carregar observações.'; try{const j=await r.json(); if(j?.error) msg+=` (${j.error})`;}catch{}
      throw new Error(msg);
    }
    const out = await r.json();
    obsState.page = Number(out.page || 1);
    obsState.totalPages = Number(out.totalPages || 1);
    renderObsList(out.data || []);
    renderObsPager();
  }

  function renderObsList(items){
    const ul = document.getElementById('obs-list');
    if(!ul) return;
    if(!items.length){ ul.innerHTML = `<li class="obs-empty">Nenhuma observação.</li>`; return; }
    ul.innerHTML = items.map(o => `
      <li class="obs-item">
        <div class="obs-item-head">
          <strong>${esc(o?.doctor?.name || '—')}</strong>
          <span class="obs-date">${fmtDateTime(o?.createdAt)}</span>
        </div>
        <div class="obs-note">${esc(o?.note || '')}</div>
      </li>`).join('');
  }

  function renderObsPager(){
    const info = document.getElementById('obs-page-info');
    const prev = document.getElementById('obs-prev');
    const next = document.getElementById('obs-next');
    if(info) info.textContent = `Página ${obsState.page}/${obsState.totalPages}`;
    if(prev) prev.disabled = obsState.page <= 1;
    if(next) next.disabled = obsState.page >= obsState.totalPages;
  }

  async function submitObservation(patientId, note){
    const r = await fetch(`/medico/pacientes/${encodeURIComponent(patientId)}/observacoes`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json','Accept':'application/json' },
      body: JSON.stringify({ note })
    });
    if(!r.ok){
      let msg='Não foi possível criar a observação.'; try{const j=await r.json(); if(j?.error) msg+=` (${j.error})`;}catch{}
      throw new Error(msg);
    }
    return r.json();
  }

  // ====== EXAMES ======
  async function loadExams(patientId){
    const list = document.getElementById('exams-list');
    if (list) list.innerHTML = `<div class="exams-empty">Carregando exames...</div>`;
    try{
      const r = await fetch(`/medico/exames/paciente/${encodeURIComponent(patientId)}`, { headers:{ 'Accept':'application/json' }});
      if (!r.ok){
        let msg = 'Falha ao carregar exames.'; try{ const j=await r.json(); if (j?.error) msg += ` (${j.error})`; }catch{}
        throw new Error(msg);
      }
      const items = await r.json();
      renderExams(Array.isArray(items)? items : []);
    }catch(e){
      console.error(e);
      if (list) list.innerHTML = `<div class="exams-empty" style="color:#b3261e">Falha ao carregar exames.</div>`;
      toast('Falha ao carregar exames.', true);
    }
  }

  function renderExams(items){
    const list = document.getElementById('exams-list');
    if (!list) return;
    if (!items.length){
      list.innerHTML = `<div class="exams-empty">Nenhum exame anexado para este paciente.</div>`;
      return;
    }
    list.innerHTML = items.map(ex => `
      <div class="exam-item" data-exam-id="${ex.id}" data-exam-mime="${esc(ex.mimeType||'')}" data-exam-fn="${esc(ex.filename||'')}">
        <div class="exam-info">
          <div class="exam-name">${esc(ex.filename || `Exame #${ex.id}`)}</div>
          <div class="exam-meta">${esc(ex.mimeType || 'arquivo')} • ${fmtDateTime(ex.createdAt)}</div>
        </div>
        <div class="exam-actions">
          <button class="btn btn-ghost btn-sm" data-exam-view>Visualizar</button>
          <a class="btn btn-sm btn-primary" href="/medico/exames/${ex.id}/download">Baixar</a>
        </div>
      </div>
    `).join('');
  }

  // Detecta tipo esperado por mime ou extensão
  function guessType(mime, filename){
    const m = (mime||'').toLowerCase();
    if (m.startsWith('image/')) return 'image';
    if (m === 'application/pdf' || /\.pdf$/i.test(filename||'')) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename||'')) return 'image';
    return 'other';
  }

  async function openExamInline(examId, expectedMime, filename){
    // overlay
    const root = document.querySelector('.modal-slot .modal__card');
    if (!root) return;
    const wrap = document.createElement('div');
    wrap.className = 'inline-viewer';
    wrap.innerHTML = `
      <div class="inline-viewer__card">
        <div class="inline-viewer__top">
          <div class="inline-viewer__title">Exame #${examId}</div>
          <div class="inline-viewer__actions">
            <a class="btn btn-sm btn-primary" href="/medico/exames/${examId}/download">Baixar</a>
            <button class="inline-viewer__close">Fechar</button>
          </div>
        </div>
        <div class="inline-viewer__body" style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center">
          <div class="exams-empty">Carregando visualização...</div>
        </div>
      </div>
    `;
    root.appendChild(wrap);
    wrap.querySelector('.inline-viewer__close').addEventListener('click', ()=> wrap.remove());

    try{
      const r = await fetch(`/medico/exames/${examId}/view`);
      if (!r.ok) throw new Error('Falha ao carregar exame.');
      const blob = await r.blob();
      const realMime = blob.type || expectedMime || 'application/octet-stream';
      const type = guessType(realMime, filename);
      const url = URL.createObjectURL(blob);

      const body = wrap.querySelector('.inline-viewer__body');
      if (type === 'image'){
        body.innerHTML = `<img class="inline-viewer__img" alt="${esc(filename||'Imagem do exame')}" />`;
        body.querySelector('img').src = url;
      } else if (type === 'pdf'){
        body.innerHTML = `<iframe class="inline-viewer__frame" title="Exame PDF"></iframe>`;
        body.querySelector('iframe').src = url;
      } else {
        body.innerHTML = `
          <div class="exams-empty" style="text-align:center">
            Não foi possível exibir inline este arquivo (<code>${esc(realMime||'desconhecido')}</code>).
            <div style="margin-top:10px">
              <a class="btn btn-sm btn-primary" href="/medico/exames/${examId}/download">Baixar</a>
            </div>
          </div>`;
      }
    }catch(e){
      console.error(e);
      toast('Falha ao visualizar o exame.', true);
      const body = wrap.querySelector('.inline-viewer__body');
      if (body) {
        body.innerHTML = `<div class="exams-empty" style="color:#b3261e">Falha ao visualizar. Tente baixar o arquivo.</div>`;
      }
    }
  }

  // eventos
  document.addEventListener('click', async (ev)=>{
    // clique nos itens da tabela
    const tr = ev.target.closest('tr[data-id]');
    if (tr) {
      const apptId = tr.getAttribute('data-id');
      const patientId = Number(tr.getAttribute('data-patient-id') || 0);
      const status = String(tr.getAttribute('data-status') || 'open'); // 'open' | 'completed'
      const readOnly = status === 'completed';

      if (ev.target.matches('[data-finish]')){
        try{
          ev.target.disabled = true;
          ev.target.textContent = 'Finalizando...';
          const r = await fetch(`/medico/consultas/${apptId}/finalizar`, {
            method:'PATCH', headers:{ 'Content-Type':'application/json','Accept':'application/json' }, body: JSON.stringify({})
          });
          if (!r.ok){
            let msg='Não foi possível finalizar.'; try{const j=await r.json(); if(j?.error) msg+=` (${j.error})`;}catch{}
            throw new Error(msg);
          }
          toast('Consulta finalizada.');
          await load();
        }catch(e){ console.error(e); toast(e.message || 'Erro ao finalizar.', true); }
        finally{ ev.target.disabled=false; ev.target.textContent='Finalizar'; }
        return;
      }

      if (ev.target.matches('[data-detail]')){
        const full = cacheOpen.concat(cacheCompleted).find(a => String(a.id) === String(apptId));
        const patient = full?.patient || {
          id: patientId,
          name: tr.children?.[1]?.textContent?.trim() || `Paciente ${patientId}`,
          patientProfile: { phone: tr.children?.[2]?.textContent?.trim() || '-' },
          updatedAt: null
        };

        const html = `<div class="modal"><div class="modal__card" style="max-width:960px">${buildModalContent(patient, { readOnly })}</div></div>`;
        openModal(html);

        // Observações
        obsState.patientId = patient.id;
        obsState.page = 1;
        try{ await loadObservations(obsState.patientId, obsState.page); }
        catch(e){ console.error(e); toast(e.message || 'Erro ao carregar observações.', true); renderObsList([]); renderObsPager(); }

        document.getElementById('obs-prev')?.addEventListener('click', async ()=>{
          if (obsState.page <= 1) return;
          try{ await loadObservations(obsState.patientId, obsState.page - 1); }catch(e){ console.error(e); toast(e.message || 'Falha ao paginar.', true); }
        });
        document.getElementById('obs-next')?.addEventListener('click', async ()=>{
          if (obsState.page >= obsState.totalPages) return;
          try{ await loadObservations(obsState.patientId, obsState.page + 1); }catch(e){ console.error(e); toast(e.message || 'Falha ao paginar.', true); }
        });

        // Form observação (somente se não for leitura)
        if (!readOnly) {
          const form = document.getElementById('obs-form');
          const noteEl = document.getElementById('obs-note');
          const submitBtn = document.getElementById('obs-submit');

          // auto-resize
          if (noteEl) {
            const fit = el => { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight, window.innerHeight*0.5)+'px'; };
            fit(noteEl);
            ['input','change'].forEach(evt => noteEl.addEventListener(evt, ()=>fit(noteEl)));
            noteEl.addEventListener('keydown', (e)=>{
              if (e.ctrlKey && e.key === 'Enter'){ e.preventDefault(); form?.dispatchEvent(new Event('submit', { cancelable:true })); }
            });
          }

          form?.addEventListener('submit', async (e)=>{
            e.preventDefault();
            const note = (noteEl?.value || '').trim();
            if (!note){ toast('Escreva a observação antes de enviar.', true); return; }
            try{
              submitBtn.disabled = true;
              submitBtn.textContent = 'Enviando...';
              await submitObservation(obsState.patientId, note);
              noteEl.value = '';
              if (noteEl) { noteEl.style.height='auto'; }
              toast('Observação adicionada.');
              await loadObservations(obsState.patientId, 1);
            }catch(err){ console.error(err); toast(err.message || 'Erro ao criar observação.', true); }
            finally{ submitBtn.disabled=false; submitBtn.textContent='Adicionar'; }
          });
        }

        // Exames
        await loadExams(patient.id);

        // Delegação: visualizar exame (usa fetch + blob, independe do header)
        document.querySelector('.modal-slot')?.addEventListener('click', (e)=>{
          const btn = e.target.closest('[data-exam-view]');
          if (!btn) return;
          const card = btn.closest('.exam-item');
          const examId = card?.getAttribute('data-exam-id');
          const mime = card?.getAttribute('data-exam-mime') || '';
          const fn = card?.getAttribute('data-exam-fn') || '';
          if (examId) openExamInline(examId, mime, fn);
        }, { once:false });

        return;
      }
    }
  });

  $tabOpen?.addEventListener('click', ()=>activate('open'));
  $tabCompleted?.addEventListener('click', ()=>activate('completed'));
  $refresh?.addEventListener('click', load);

  activate('open');
  load();
})();
