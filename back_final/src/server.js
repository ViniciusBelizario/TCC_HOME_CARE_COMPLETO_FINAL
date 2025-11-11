const { app } = require('./app');
const { loadEnv } = require('./config/env');
const { sequelize, initModels } = require('./db');
const { startLogRetentionJob } = require('./jobs/logRetention');

(async () => {
  const { PORT } = loadEnv();
  await initModels();
  await sequelize.sync({ alter: true });
  startLogRetentionJob();
  app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`));
})();
