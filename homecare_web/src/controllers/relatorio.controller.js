export async function view(req, res) {
  try {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3333/api';
    const auth = res.locals?.auth || {};

    res.render('relatorio/index', {
      titulo: 'Relatórios',
      apiBaseUrl,
      auth,
    });
  } catch (err) {
    console.error('Erro ao carregar Relatório:', err);
    res.status(500).send('Erro ao carregar a página de Relatório');
  }
}
