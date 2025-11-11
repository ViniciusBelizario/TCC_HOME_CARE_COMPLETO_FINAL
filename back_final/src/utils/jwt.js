// file: src/utils/jwt.js
const jwt = require('jsonwebtoken');
const { loadEnv } = require('../config/env');
const { JWT_SECRET, JWT_EXPIRES_IN } = loadEnv();

function signJwt(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }); }
function verifyJwt(token) { return jwt.verify(token, JWT_SECRET); }
module.exports = { signJwt, verifyJwt };
