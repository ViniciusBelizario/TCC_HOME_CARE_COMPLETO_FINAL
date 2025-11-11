// file: src/storage/local.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../config/env');

const { UPLOAD_DIR } = loadEnv();
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(UPLOAD_DIR)),
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/\s+/g, '_');
      cb(null, `${ts}-${safe}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = { upload };
