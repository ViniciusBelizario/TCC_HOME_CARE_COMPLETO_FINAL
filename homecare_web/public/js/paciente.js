// public/js/paciente.js
(function () {
  const pacientesInicial = Array.isArray(window.PACIENTES) ? window.PACIENTES : [];
  const AUTH = window.AUTH || {};
  const $tbody = document.getElementById('pacientesTbody');
  const $modalRoot = document.querySelector('.modal-root');
  const $slot = $modalRoot.querySelector('.modal-slot');
  const $toastStack = document.getElementById('toast-stack');
  const $q = document.getElementById('q');

  (function ensureModalOnBody() {
    if ($modalRoot && $modalRoot.parentElement !== document.body) {
      document.body.appendChild($modalRoot);
    }
  })();

  function toast({ title = 'Aviso', message = '', variant = 'success', timeout = 6000 }) {
    if (!$toastStack) { alert(`${title}: ${message}`); return; }
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.innerHTML = `
      <div class="toast__bar"></div>
      <div class="toast__content">
        <strong class="toast__title">${title}</strong>
        <p class="toast__message">${message}</p>
      </div>
      <button class="toast__close" aria-label="Fechar">&times;</button>
    `;
    $toastStack.appendChild(el);
    const close = () => { el.classList.add('toast--hide'); setTimeout(() => el.remove(), 250); };
    el.querySelector('.toast__close').addEventListener('click', close);
    setTimeout(close, timeout);
  }

  const state = { byId: new Map(), list: [] };

  function renderRowCells(p) {
    const phone = p?.patientProfile?.phone || '-';
    return `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td class="cell-phone">${phone}</td>
      <td><button class="btn btn--sm btn-detail">Detalhe</button></td>
    `;
  }

  function createRow(p) {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = renderRowCells(p);
    return tr;
  }

  function setStateAndRender(list) {
    state.byId.clear();
    state.list = list.slice().sort((a, b) => Number(b.id) - Number(a.id));
    for (const p of state.list) state.byId.set(String(p.id), p);
    $tbody.innerHTML = state.list.map(p => createRow(p).outerHTML).join('');
  }

  setStateAndRender(pacientesInicial);

  $modalRoot.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) fecharModal();
    if (e.target.closest('[data-close]')) { e.preventDefault(); fecharModal(); }
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-detail');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    abrirDetalhe(id);
  });

  const btnCadastrar = document.getElementById('btnCadastrar');
  btnCadastrar?.addEventListener('click', () => abrirCadastro());

  // ===== Busca server-side com debounce =====
  let searchAbort = null;
  let searchTimer = null;

  async function buscar(term) {
    if (searchAbort) searchAbort.abort();
    searchAbort = new AbortController();

    const url = `/pacientes/busca?q=${encodeURIComponent(term)}`;
    const r = await fetch(url, { signal: searchAbort.signal, headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('Falha na busca');
    const json = await r.json();
    return Array.isArray(json?.items) ? json.items : [];
  }

  function onSearchInput() {
    const term = ($q?.value || '').trim();
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      try {
        if (!term) {
          // vazio -> volta para a lista inicial (ou poderia chamar _list.json)
          setStateAndRender(pacientesInicial);
          return;
        }
        const items = await buscar(term);
        setStateAndRender(items);
      } catch (e) {
        console.debug('busca falhou', e);
      }
    }, 300);
  }
  $q?.addEventListener('input', onSearchInput);

  // ===== Detalhe =====
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

      const canReset = !!(AUTH?.isAdmin || AUTH?.isAtendente);
      const resetBtnHtml = canReset
        ? `<button type="button" class="btn btn--warning" id="btnResetSenha" data-id="${p.id}">🔒 Resetar senha</button>`
        : '';

      const html = `
        <div class="modal">
          <div class="modal__card">
            <h2 class="modal__title">Detalhes do paciente</h2>
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
              <button type="button" class="btn btn--ghost" data-close>Voltar</button>
              ${resetBtnHtml}
            </div>
          </div>
        </div>`;
      $slot.innerHTML = html;
      $modalRoot.classList.add('is-open');

      if (canReset) {
        const $btnReset = document.getElementById('btnResetSenha');
        $btnReset?.addEventListener('click', () => handleResetSenha(p.id, $btnReset));
      }
    } catch (e) {
      console.error(e);
      alert('Não foi possível carregar detalhes do paciente.');
    }
  }

  async function handleResetSenha(patientId, $btn) {
    const original = $btn.innerHTML;
    $btn.disabled = true;
    $btn.innerHTML = 'Processando...';

    try {
      const r = await fetch(`/pacientes/${patientId}/reset-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok || data?.ok === false) {
        throw new Error(data?.message || `Erro ao resetar senha (HTTP ${r.status})`);
      }

      const hint = data?.temporaryPasswordHint ? ` Dica: ${data.temporaryPasswordHint}.` : '';
      toast({
        title: 'Senha resetada',
        message: `${data?.message || 'Senha resetada com sucesso.'}${hint} O usuário deverá alterá-la no primeiro acesso.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Falha ao resetar',
        message: err?.message || 'Não foi possível resetar a senha.',
        variant: 'danger',
      });
    } finally {
      $btn.disabled = false;
      $btn.innerHTML = original;
    }
  }

  // ===== Cadastro =====
  function abrirCadastro() {
    const hoje = new Date().toISOString().slice(0, 10);
    const html = `
      <div class="modal">
        <div class="modal__card">
          <h2 class="modal__title">Cadastrar paciente</h2>
          <form id="formCadastro" class="form" novalidate>
            <div class="field">
              <label class="label">Nome</label>
              <input name="name" class="input" placeholder="Nome completo" required />
            </div>
            <div class="field">
              <label class="label">E-mail</label>
              <input name="email" type="email" class="input" placeholder="email@dominio.com" required />
            </div>
            <div class="field">
              <label class="label">CPF</label>
              <input name="cpf" class="input" placeholder="Somente números" minlength="11" maxlength="11" required />
            </div>
            <div class="field">
              <label class="label">Senha</label>
              <input name="password" type="password" class="input" placeholder="••••••••" minlength="6" required />
            </div>
            <div class="field">
              <label class="label">Telefone</label>
              <input name="phone" class="input" placeholder="11999999999" />
            </div>
            <div class="field">
              <label class="label">Endereço</label>
              <input name="address" class="input" placeholder="Rua, número, bairro" />
            </div>
            <div class="field">
              <label class="label">Nascimento</label>
              <input name="birthDate" type="date" class="input" max="${hoje}" />
            </div>
            <div class="form__error" id="formError" aria-live="polite"></div>
            <div class="modal__footer">
              <button type="button" class="btn btn--ghost" data-close>Voltar</button>
              <button type="submit" class="btn btn--primary" id="btnSalvar">Salvar</button>
            </div>
          </form>
        </div>
      </div>`;
    $slot.innerHTML = html;
    $modalRoot.classList.add('is-open');

    const $form = document.getElementById('formCadastro');
    const $formError = document.getElementById('formError');
    const $btnSalvar = document.getElementById('btnSalvar');
    const $cpf = $form.querySelector('input[name="cpf"]');
    const $phone = $form.querySelector('input[name="phone"]');

    // máscara simples de CPF / telefone (somente números)
    $cpf?.addEventListener('input', () => {
      $cpf.value = ($cpf.value || '').replace(/\D/g, '').slice(0, 11);
    });
    $phone?.addEventListener('input', () => {
      $phone.value = ($phone.value || '').replace(/\D/g, '').slice(0, 11);
    });

    function setError(msg) {
      if (!$formError) return;
      $formError.textContent = msg || '';
    }

    $form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setError('');

      const formData = new FormData($form);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        cpf: String(formData.get('cpf') || '').replace(/\D/g, ''),
        password: String(formData.get('password') || ''),
        phone: String(formData.get('phone') || '').replace(/\D/g, '') || null,
        address: String(formData.get('address') || '').trim() || null,
        birthDate: String(formData.get('birthDate') || '') || null,
      };

      // validação simples
      if (!payload.name) return setError('Nome é obrigatório.');
      if (!payload.email) return setError('E-mail é obrigatório.');
      if (!payload.cpf || payload.cpf.length !== 11) return setError('CPF deve conter 11 dígitos.');
      if (!payload.password || payload.password.length < 6) return setError('Senha deve ter pelo menos 6 caracteres.');

      $btnSalvar.disabled = true;
      $btnSalvar.textContent = 'Salvando...';

      try {
        const r = await fetch('/pacientes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await r.json().catch(() => ({}));

        if (!r.ok) {
          const msg = data?.error || data?.message || `Erro ao criar paciente (HTTP ${r.status})`;
          throw new Error(msg);
        }

        // monta paciente para tabela
        const novoPaciente = {
          id: data.id,
          name: data.name,
          email: data.email || payload.email,
          cpf: data.cpf || payload.cpf,
          patientProfile: {
            phone: (data.patientProfile && data.patientProfile.phone) || payload.phone || '',
          },
        };

        // atualiza estado / tabela
        const novaLista = [...state.list, novoPaciente];
        setStateAndRender(novaLista);

        toast({
          title: 'Paciente cadastrado',
          message: 'Paciente cadastrado com sucesso.',
          variant: 'success',
        });

        fecharModal();
      } catch (err) {
        console.error('erro cadastro paciente', err);
        setError(err?.message || 'Erro ao criar paciente.');
      } finally {
        $btnSalvar.disabled = false;
        $btnSalvar.textContent = 'Salvar';
      }
    });
  }

  function fecharModal() {
    $modalRoot.classList.remove('is-open');
    $slot.innerHTML = '';
  }

  // Auto-refresh quando NÃO há termo de busca
  const REFRESH_MS = 10000;
  setInterval(async () => {
    const term = ($q?.value || '').trim();
    if (term) return; // não atropela a busca ativa
    try {
      const r = await fetch('/pacientes/_list.json', { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return;
      const json = await r.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      setStateAndRender(items);
    } catch {}
  }, REFRESH_MS);
})();
