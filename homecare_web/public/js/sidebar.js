// public/js/sidebar.js (versão sem "rail" e sem overlay)
(function () {
  const body = document.body;

  // 1) Garante modo expandido SEMPRE
  body.classList.remove('is-rail');
  body.classList.remove('show-sidebar');

  // 2) Apaga qualquer estado salvo anteriormente
  try {
    localStorage.removeItem('sidebarRail');
  } catch (_) {}

  // 3) Destacar item ativo
  const path = location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.menu__item').forEach(a => {
    const href = a.getAttribute('href');
    if ((path === '' && href === '/') || (href !== '/' && path.startsWith(href))) {
      a.classList.add('is-active');
    }
  });
})();
