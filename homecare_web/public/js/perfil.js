// public/js/perfil.js
(function () {
  const $skeleton = document.getElementById('skeleton');
  const $wrap = document.getElementById('perfilWrap');

  const $pfName = document.getElementById('pfName');
  const $pfRole = document.getElementById('pfRole');
  const $pfEmail = document.getElementById('pfEmail');
  const $pfCPF = document.getElementById('pfCPF');
  const $pfCreated = document.getElementById('pfCreated');
  const $pfUpdated = document.getElementById('pfUpdated');
  const $pfCRM = document.getElementById('pfCRM');
  const $pfSpec = document.getElementById('pfSpec');
  const $medBlock = document.getElementById('medBlock');
  const $avatar = document.getElementById('avatar');

  const $btnRefresh = document.getElementById('btnRefresh');
  const $copyName = document.getElementById('copyName');
  const $copyEmail = document.getElementById('copyEmail');
  const $copyCPF = document.getElementById('copyCPF');

  function showSkeleton(on){
    $skeleton.style.display = on ? '' : 'none';
    $wrap.style.opacity = on ? '0.25' : '1';
  }

  function initials(name){
    if (!name) return '??';
    return name.split(' ').filter(Boolean).map(p=>p[0]).slice(0,2).join('').toUpperCase();
  }

  function maskCPF(cpf){
    const s = String(cpf || '').replace(/\D/g,'').padStart(11,'0').slice(-11);
    return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9,11)}`;
  }

  function fmtDate(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function paintRole(role){
    const r = (role||'').toUpperCase();
    $pfRole.textContent = r || '—';
    $pfRole.classList.remove('role--admin','role--medico','role--atendente');
    if (r === 'ADMIN') $pfRole.classList.add('role--admin');
    if (r === 'MEDICO') $pfRole.classList.add('role--medico');
    if (r === 'ATENDENTE') $pfRole.classList.add('role--atendente');
  }

  function fill(u){
    $pfName.textContent = u?.name || '—';
    $pfEmail.textContent = u?.email || '—';
    $pfCPF.textContent = maskCPF(u?.cpf);
    $pfCreated.textContent = fmtDate(u?.createdAt);
    $pfUpdated.textContent = fmtDate(u?.updatedAt);
    $avatar.textContent = initials(u?.name);
    paintRole(u?.role);

    if (u?.role === 'MEDICO'){
      $medBlock.style.display = '';
      $pfCRM.textContent = u?.doctorProfile?.crm || '—';
      $pfSpec.textContent = u?.doctorProfile?.specialty || '—';
    } else {
      $medBlock.style.display = 'none';
    }
  }

  async function load(){
    try{
      showSkeleton(true);
      const r = await fetch('/perfil/me', { headers: { 'Accept':'application/json' } });
      if (!r.ok) throw new Error('load_error');
      const u = await r.json();
      fill(u);
      $wrap.style.display = '';
    } catch (e){
      console.error(e);
      toast('Erro ao carregar perfil', true);
    } finally {
      showSkeleton(false);
    }
  }

  // Boot SSR
  const boot = window.__PROFILE_BOOT__;
  if (boot) fill(boot); else $wrap.style.display = 'none';

  $btnRefresh?.addEventListener('click', load);

  async function copy(text){
    try{ await navigator.clipboard.writeText(text ?? ''); toast('Copiado!'); }
    catch{ toast('Não foi possível copiar', true); }
  }
  $copyName?.addEventListener('click', ()=> copy($pfName.textContent));
  $copyEmail?.addEventListener('click', ()=> copy($pfEmail.textContent));
  $copyCPF?.addEventListener('click', ()=> copy($pfCPF.textContent));

  function toast(msg, isErr=false){
    let el = document.querySelector('.toast');
    if(!el){
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
    el._t = setTimeout(()=>{ el.style.display='none'; }, 2000);
  }
})();
