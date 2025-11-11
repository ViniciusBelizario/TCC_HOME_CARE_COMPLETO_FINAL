// (por enquanto, dados mockados; futuramente trocamos por chamadas na sua API)
const MOCK = [
  { id: 1, nome: 'Ana Souza', email: 'ana@exemplo.com', perfil: 'Enfermeira' },
  { id: 2, nome: 'Carlos Lima', email: 'carlos@exemplo.com', perfil: 'Cuidador' }
];

export const listar = (req, res) => {
  res.render('usuario/listar', { titulo: 'Usuários', usuarios: MOCK });
};

export const formCadastrar = (req, res) => {
  res.render('usuario/cadastrar', { titulo: 'Cadastrar usuário' });
};

export const cadastrar = (req, res) => {
  // TODO: integrar com API
  res.redirect('/usuario');
};

export const formEditar = (req, res) => {
  const usuario = MOCK.find(u => u.id === Number(req.params.id));
  res.render('usuario/editar', { titulo: 'Editar usuário', usuario });
};

export const editar = (req, res) => {
  // TODO: integrar com API
  res.redirect('/usuario');
};

export const remover = (req, res) => {
  // TODO
  res.redirect('/usuario');
};
