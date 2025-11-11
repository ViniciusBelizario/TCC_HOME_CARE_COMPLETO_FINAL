// src/public/js/cadastro.js

// ----------------- Utils -----------------
function qs(sel, el = document) { return el.querySelector(sel); }
function qsa(sel, el = document) { return Array.from(el.querySelectorAll(sel)); }
function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim()); }
function onlyDigits(s){ return String(s||'').replace(/\D/g,''); }
function escapeHtml(s){ return String(s??'').replace(/[&<>"'`=\/]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])); }
async function safeJson(res){ try { return await res.json(); } catch { return null; } }

// Toast básico no padrão do sistema
function toast({ title='Aviso', message='', variant='success', timeout=6000 }){
  let stack = qs('#toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${variant}`;
  el.innerHTML = `
    <div class="toast__bar"></div>
    <div class="toast__content">
      <strong class="toast__title">${escapeHtml(title)}</strong>
      <p class="toast__message">${escapeHtml(message)}</p>
    </div>
    <button class="toast__close" aria-label="Fechar">&times;</button>
  `;
  stack.appendChild(el);
  const close = () => { el.classList.add('toast--hide'); setTimeout(()=>el.remove(), 250); };
  el.querySelector('.toast__close')?.addEventListener('click', close);
  setTimeout(close, timeout);
}

// CPF mask + fmt
function maskCPF(value){ return String(value||'').replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
function fmtCPF(d){ const v=onlyDigits(d); return v.length===11?v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,(_,$1,$2,$3,$4)=>`${$1}.${$2}.${$3}-${$4}`):v; }
function fmtDate(iso){ if(!iso) return ''; const d=new Date(iso); return Number.isNaN(d.getTime())?String(iso):d.toLocaleString(); }

// ----------------- Modal -----------------
function openModal(target){
  const overlay=qs('#cadastro-modal'); const body=document.body;
  qsa('.modal-form',overlay).forEach(f=>f.hidden=true);
  const title=qs('#modal-title',overlay);
  if(target==='attendant'){ title.textContent='Cadastrar Atendente'; qs('#form-attendant',overlay).hidden=false; }
  else { title.textContent='Cadastrar Médico'; qs('#form-doctor',overlay).hidden=false; }
  const alert=qs('#form-alert',overlay); alert.hidden=true; alert.className='alert'; alert.textContent='';
  overlay.classList.add('is-open'); body.classList.add('modal-open');
  qs('.modal-form:not([hidden]) input',overlay)?.focus();
}
function closeModal(){ const overlay=qs('#cadastro-modal'); const body=document.body; overlay.classList.remove('is-open'); body.classList.remove('modal-open'); }
function setSubmitting(form,isLoading){ const btn=qs('[data-submit]',form); if(!btn) return; btn.classList.toggle('loading',!!isLoading); btn.disabled=!!isLoading; }
function showAlert(type,msg){ const a=qs('#form-alert'); if(!msg){ a.hidden=true; a.textContent=''; a.className='alert'; return; } a.hidden=false; a.className=`alert ${type==='error'?'error':'success'}`; a.textContent=msg; }

// ----------------- Validações -----------------
function validateAttendantPayload(raw){
  const payload={ name:String(raw.name||'').trim(), email:String(raw.email||'').trim(), cpf:onlyDigits(raw.cpf), password:String(raw.password||'') };
  const errors=[]; if(!payload.name) errors.push('Nome é obrigatório.'); if(!isEmail(payload.email)) errors.push('E-mail inválido.'); if(payload.cpf.length!==11) errors.push('CPF deve conter 11 dígitos.'); if(payload.password.length<6) errors.push('Senha deve ter ao menos 6 caracteres.');
  return {payload,errors};
}
function validateDoctorPayload(raw){
  const payload={ name:String(raw.name||'').trim(), email:String(raw.email||'').trim(), cpf:onlyDigits(raw.cpf), password:String(raw.password||''), specialty:String(raw.specialty||'').trim(), crm:String(raw.crm||'').trim().toUpperCase() };
  const errors=[]; if(!payload.name) errors.push('Nome é obrigatório.'); if(!isEmail(payload.email)) errors.push('E-mail inválido.'); if(payload.cpf.length!==11) errors.push('CPF deve conter 11 dígitos.'); if(payload.password.length<6) errors.push('Senha deve ter ao menos 6 caracteres.'); if(!payload.specialty) errors.push('Especialidade é obrigatória.');
  const CRM_RE=/^CRM-[A-Z]{2}-\d{4,7}$/; if(!CRM_RE.test(payload.crm)) errors.push('CRM inválido (use o formato CRM-UF-123456).');
  return {payload,errors};
}

// ----------------- Listagens -----------------
async function loadDoctors(params={}){
  const tbody=qs('#doctors-table tbody'); if(!tbody) return;
  tbody.innerHTML=`<tr><td colspan="7">Carregando...</td></tr>`;
  try{
    const usp=new URLSearchParams(params); const res=await fetch(`/cadastro/doctors?${usp.toString()}`,{method:'GET'}); const data=await safeJson(res);
    if(!res.ok) throw new Error(data?.error||data?.message||'Falha ao carregar médicos.');
    const items=Array.isArray(data?.data)?data.data:[];
    renderDoctorsTable(items);
  }catch(err){ tbody.innerHTML=`<tr><td colspan="7" style="color:#b71c1c;">${escapeHtml(err.message||'Erro ao carregar.')}</td></tr>`; }
}
function renderDoctorsTable(items){
  const tbody=qs('#doctors-table tbody');
  const rows=items.map(d=>`<tr data-user-id="${escapeHtml(String(d?.id??''))}">
    <td>${escapeHtml(d?.name??'')}</td>
    <td>${escapeHtml(d?.email??'')}</td>
    <td>${escapeHtml(fmtCPF(d?.cpf||''))}</td>
    <td>${escapeHtml(d?.specialty??'')}</td>
    <td>${escapeHtml(d?.crm??'')}</td>
    <td>${escapeHtml(fmtDate(d?.createdAt))}</td>
    <td><button type="button" class="btn btn-warning btn-reset" title="Resetar senha">Resetar senha</button></td>
  </tr>`).join('');
  tbody.innerHTML = rows || `<tr><td colspan="7">Nenhum médico encontrado.</td></tr>`;
}

async function loadAttendants(params={}){
  const tbody=qs('#attendants-table tbody'); if(!tbody) return;
  tbody.innerHTML=`<tr><td colspan="5">Carregando...</td></tr>`;
  try{
    const usp=new URLSearchParams(params); const res=await fetch(`/cadastro/attendants?${usp.toString()}`,{method:'GET'}); const data=await safeJson(res);
    if(!res.ok) throw new Error(data?.error||data?.message||'Falha ao carregar atendentes.');
    const items=Array.isArray(data?.data)?data.data:[];
    renderAttendantsTable(items);
  }catch(err){ tbody.innerHTML=`<tr><td colspan="5" style="color:#b71c1c;">${escapeHtml(err.message||'Erro ao carregar.')}</td></tr>`; }
}
function renderAttendantsTable(items){
  const tbody=qs('#attendants-table tbody');
  const rows=items.map(a=>`<tr data-user-id="${escapeHtml(String(a?.id??''))}">
    <td>${escapeHtml(a?.name??'')}</td>
    <td>${escapeHtml(a?.email??'')}</td>
    <td>${escapeHtml(fmtCPF(a?.cpf||''))}</td>
    <td>${escapeHtml(fmtDate(a?.createdAt))}</td>
    <td><button type="button" class="btn btn-warning btn-reset" title="Resetar senha">Resetar senha</button></td>
  </tr>`).join('');
  tbody.innerHTML = rows || `<tr><td colspan="5">Nenhum atendente encontrado.</td></tr>`;
}

// ----------------- Reset de senha -----------------
async function resetUserPassword(userId){
  const res = await fetch(`/cadastro/users/${encodeURIComponent(userId)}/reset-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await safeJson(res);
  if (!res.ok || data?.ok === false) {
    const msg = data?.message || 'Falha ao resetar a senha.';
    throw new Error(msg);
  }
  const hint = data?.temporaryPasswordHint ? ` Dica: ${data.temporaryPasswordHint}.` : '';
  toast({
    title: 'Senha resetada',
    message: `${data?.message || 'Senha resetada com sucesso.'}${hint} O usuário deverá alterá-la no primeiro acesso.`,
    variant: 'success'
  });
}

// ----------------- Init -----------------
document.addEventListener('DOMContentLoaded',()=>{
  // Botões cadastro (modal)
  const btnOpenAtt=qs('#btn-open-attendant'); const btnOpenDoc=qs('#btn-open-doctor'); const overlay=qs('#cadastro-modal');
  btnOpenAtt?.addEventListener('click',()=>openModal('attendant')); btnOpenDoc?.addEventListener('click',()=>openModal('doctor'));
  qsa('[data-close]',overlay).forEach(b=>b.addEventListener('click',closeModal));

  // Máscara CPF inputs
  qsa('input[name="cpf"]',overlay).forEach(inp=>{
    inp.addEventListener('input',()=>{ const caret=inp.selectionStart; inp.value=maskCPF(inp.value); try{inp.setSelectionRange(caret,caret);}catch{} });
  });

  // Evitar Enter submeter form sem querer
  qsa('.modal-form input',overlay).forEach(i=>i.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); }}));

  // Submits
  const formAtt=qs('#form-attendant',overlay);
  formAtt?.addEventListener('submit',async e=>{
    e.preventDefault(); showAlert('', '');
    const {payload,errors}=validateAttendantPayload(Object.fromEntries(new FormData(formAtt).entries()));
    if(errors.length){ showAlert('error',errors.join(' ')); return; }
    try{
      setSubmitting(formAtt,true);
      const res=await fetch('/cadastro/attendant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await safeJson(res);
      if(!res.ok){
        let msg=data?.message||data?.error||'Erro ao cadastrar.';
        if(Array.isArray(data?.errors)&&data.errors.length){ msg=data.errors.map(e=>e?.message||String(e)).join(' '); }
        throw new Error(msg);
      }
      showAlert('success','Atendente cadastrado com sucesso!');
      formAtt.reset(); setTimeout(closeModal,900);
      if (qs('#tab-attendants').classList.contains('is-active')) { await doSearchOrRefresh(); }
    }catch(err){ showAlert('error',err.message||'Erro ao cadastrar.'); } finally{ setSubmitting(formAtt,false); }
  });

  const formDoc=qs('#form-doctor',overlay);
  formDoc?.addEventListener('submit',async e=>{
    e.preventDefault(); showAlert('', '');
    const {payload,errors}=validateDoctorPayload(Object.fromEntries(new FormData(formDoc).entries()));
    if(errors.length){ showAlert('error',errors.join(' ')); return; }
    try{
      setSubmitting(formDoc,true);
      const res=await fetch('/cadastro/doctor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await safeJson(res);
      if(!res.ok){
        let msg=data?.message||data?.error||'Erro ao cadastrar.';
        if(Array.isArray(data?.errors)&&data.errors.length){ msg=data.errors.map(e=>e?.message||String(e)).join(' '); }
        throw new Error(msg);
      }
      showAlert('success','Médico cadastrado com sucesso!');
      formDoc.reset(); setTimeout(closeModal,900);
      if (qs('#tab-doctors').classList.contains('is-active')) { await doSearchOrRefresh(); }
    }catch(err){ showAlert('error',err.message||'Erro ao cadastrar.'); } finally{ setSubmitting(formDoc,false); }
  });

  // Abas
  const tabBtnDoctors=qs('#tab-btn-doctors'); const tabBtnAtt=qs('#tab-btn-attendants');
  const panelDoctors=qs('#tab-doctors'); const panelAtt=qs('#tab-attendants');
  function activateTab(target){
    const isDoctors = target==='doctors';
    tabBtnDoctors.classList.toggle('is-active',isDoctors);
    tabBtnAtt.classList.toggle('is-active',!isDoctors);
    tabBtnDoctors.setAttribute('aria-selected', String(isDoctors));
    tabBtnAtt.setAttribute('aria-selected', String(!isDoctors));
    panelDoctors.classList.toggle('is-active',isDoctors);
    panelDoctors.hidden = !isDoctors;
    panelAtt.classList.toggle('is-active',!isDoctors);
    panelAtt.hidden = isDoctors;
    qs('#search-type').value = isDoctors ? 'doctors' : 'attendants';
    doSearchOrRefresh();
  }
  tabBtnDoctors?.addEventListener('click',()=>activateTab('doctors'));
  tabBtnAtt?.addEventListener('click',()=>activateTab('attendants'));

  // Busca unificada
  const selType=qs('#search-type'); const selBy=qs('#search-by'); const inp=qs('#search-term');
  const btnSearch=qs('#btn-search'); const btnClear=qs('#btn-clear');

  async function doSearchOrRefresh(){
    const type=selType.value; const by=selBy.value; const term=(inp.value||'').trim();
    const params={};
    if (term) {
      if(by==='cpf') params.cpf = onlyDigits(term);
      else params.q = term;
    }
    if(type==='attendants') await loadAttendants(params);
    else await loadDoctors(params);
  }

  selType?.addEventListener('change',()=>{ activateTab(selType.value==='doctors'?'doctors':'attendants'); });
  btnSearch?.addEventListener('click', doSearchOrRefresh);
  inp?.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); doSearchOrRefresh(); } });
  btnClear?.addEventListener('click', ()=>{ inp.value=''; doSearchOrRefresh(); });

  qs('#btn-refresh-doctors')?.addEventListener('click',()=>doSearchOrRefresh());
  qs('#btn-refresh-attendants')?.addEventListener('click',()=>doSearchOrRefresh());

  // Delegação: clicar em "Resetar senha" nas duas tabelas
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-reset');
    if (!btn) return;
    const tr = btn.closest('tr');
    const userId = tr?.dataset?.userId;
    if (!userId) return;
    try {
      btn.disabled = true;
      btn.textContent = 'Processando...';
      await resetUserPassword(userId);
    } catch (err) {
      toast({ title: 'Falha ao resetar', message: err?.message || 'Erro ao resetar senha.', variant: 'danger' });
    } finally {
      btn.disabled = false;
      btn.textContent = 'Resetar senha';
    }
  });

  // Primeira carga: aba Médicos ativa
  activateTab('doctors');
});
