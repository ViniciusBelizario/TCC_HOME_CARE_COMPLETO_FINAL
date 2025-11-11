// file: src/middlewares/auth.js
const { verifyJwt } = require('../utils/jwt');

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) { if (!required) return next(); return res.status(401).json({ error: 'Token ausente' }); }
    const parts = header.split(' ');
    const token = parts.length === 2 ? parts[1] : null;
    if (!token) return res.status(401).json({ error: 'Token inválido' });
    try {
      const decoded = verifyJwt(token);
      req.user = { id: decoded.id, role: decoded.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}
module.exports = { auth };
