// src/public/js/paciente-medico.js
(function () {
  const LIST = Array.isArray(window.PACIENTES) ? window.PACIENTES : [];
  const $tbody = document.getElementById('pacientesTbody');
  const $q = document.getElementById('q');
  const $modalRoot = document.querySelector('.modal-root');
  const $slot = $modalRoot.querySelector('.modal-slot');

  (function ensureModalOnBody() {
    if ($modalRoot && $modalRoot.parentElement !== document.body) {
      document.body.appendChild($modalRoot);
    }
  })();

  function render(items) {
    $tbody.innerHTML = items.map(p => `
      <tr data-id="${p.id}">
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>${p?.patientProfile?.phone || '-'}</td>
        <td>${p?.updatedAt ? new Date(p.updatedAt).toLocaleString('pt-BR') : '—'}</td>
        <td><button class="btn btn--sm btn-detail">Ver</button></td>
      </tr>
    `).join('');
  }

  render(LIST);

  // Busca server-side com debounce
  let timer = null;
  let aborter = null;

  async function buscar(term) {
    if (aborter) aborter.abort();
    aborter = new AbortController();
    const r = await fetch(`/pacientes/busca?q=${encodeURIComponent(term)}`, {
      signal: aborter.signal,
      headers: { 'Accept': 'application/json' },
    });
    if (!r.ok) throw new Error('Falha na busca');
    const json = await r.json();
    return Array.isArray(json?.items) ? json.items : [];
  }

  function onSearch() {
    const term = ($q?.value || '').trim();
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        if (!term) { render(LIST); return; }
        const items = await buscar(term);
        render(items);
      } catch (e) {
        console.debug('busca falhou', e);
      }
    }, 300);
  }
  $q?.addEventListener('input', onSearch);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-detail');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    abrirDetalhe(id);
  });

  function fecharModal() {
    $modalRoot.classList.remove('is-open');
    $slot.innerHTML = '';
  }
  $modalRoot.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) fecharModal();
    if (e.target.closest('[data-close]')) { e.preventDefault(); fecharModal(); }
  });

  async function abrirDetalhe(id) {
    try {
      const r = await fetch(`/pacientes/${id}`);
      if (!r.ok) throw new Error('Falha ao buscar paciente');
      const p = await r.json();

      const nasc = p.patientProfile?.birthDate
        ? new Date(p.patientProfile.birthDate).toLocaleDateString('pt-BR')
        : '-';

      const exames = Array.isArray(p.patientExams) && p.patientExams.length
        ? `<ul>${p.patientExams.map(e =>
            `<li><a href="${e.filePath}" target="_blank" rel="noopener">${e.filename}</a></li>`
          ).join('')}</ul>`
        : '<p>Nenhum exame cadastrado.</p>';

      const html = `
        <div class="modal">
          <div class="modal__card">
            <h2 class="modal__title">Ficha do paciente</h2>
            <div class="detail-list">
              <div class="row"><div class="label">Nome</div><div class="value">${p.name}</div></div>
              <div class="row"><div class="label">E-mail</div><div class="value">${p.email || '-'}</div></div>
              <div class="row"><div class="label">CPF</div><div class="value">${p.cpf || '-'}</div></div>
              <div class="row"><div class="label">Telefone</div><div class="value">${p.patientProfile?.phone || '-'}</div></div>
              <div class="row"><div class="label">Nascimento</div><div class="value">${nasc}</div></div>
              <div class="row"><div class="label">Endereço</div><div class="value">${p.patientProfile?.address || '-'}</div></div>
              <div class="row"><div class="label">Exames</div><div class="value">${exames}</div></div>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" data-close>Fechar</button>
            </div>
          </div>
        </div>`;
      $slot.innerHTML = html;
      $modalRoot.classList.add('is-open');
    } catch (e) {
      console.error(e);
      alert('Não foi possível carregar detalhes do paciente.');
    }
  }
})();
