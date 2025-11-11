require('dotenv').config();

function loadEnv() {
  const {
    DB_DIALECT = 'mysql',
    DB_HOST, DB_PORT = '3306', DB_USER, DB_PASS, DB_NAME,
    SQLITE_STORAGE = './data.sqlite',
    JWT_SECRET, JWT_EXPIRES_IN = '7d',
    PORT = '3333', APP_URL = 'http://localhost:3333',
    UPLOAD_DIR = './uploads',
    LOG_RETENTION_DAYS = '30',
    LOG_CLEAN_CRON = '0 3 * * *'
  } = process.env;

  if (!JWT_SECRET) throw new Error('JWT_SECRET ausente');

  if (DB_DIALECT === 'mysql') {
    if (!DB_HOST || !DB_USER || !DB_NAME) throw new Error('Variáveis de DB MySQL ausentes');
  } else if (DB_DIALECT === 'sqlite') {
    if (!SQLITE_STORAGE) throw new Error('SQLITE_STORAGE ausente');
  } else {
    throw new Error('DB_DIALECT inválido (use mysql ou sqlite)');
  }

  return {
    DB_DIALECT,
    DB_HOST, DB_PORT: Number(DB_PORT), DB_USER, DB_PASS, DB_NAME,
    SQLITE_STORAGE,
    JWT_SECRET, JWT_EXPIRES_IN,
    PORT: Number(PORT), APP_URL, UPLOAD_DIR,
    LOG_RETENTION_DAYS: Number(LOG_RETENTION_DAYS),
    LOG_CLEAN_CRON
  };
}
module.exports = { loadEnv };
