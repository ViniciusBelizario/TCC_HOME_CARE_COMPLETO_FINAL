// file: src/middlewares/error.js
function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Erro interno' });
}
module.exports = { errorHandler };
