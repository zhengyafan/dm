const fs = require('fs');
const { createApp } = require('./app');
const { config, validateConfig } = require('./config');
const db = require('./models');
const { seedInitialAdmin } = require('./services/authService');
const { optimizeDatabase } = require('./services/databaseOptimizer');

async function start() {
  validateConfig();
  fs.mkdirSync(config.uploadDir, { recursive: true });

  await db.sequelize.sync({ force: false });
  await optimizeDatabase();
  const admin = await seedInitialAdmin();
  if (admin) {
    console.log(`Initial admin user created: ${admin.username}`);
  }

  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

start().catch(err => {
  console.error('Server startup error:', err);
  process.exit(1);
});
