const express = require('express');
const cors = require('cors');
const path = require('path');
const { config } = require('./config');
const { requireAuth } = require('./middleware/auth');

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

function requestTiming(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    if (!req.path.startsWith('/api')) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (durationMs >= 250 || res.statusCode >= 400) {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
    }
  });

  next();
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(requestTiming);

  app.use(cors({
    origin: config.corsOrigin || true,
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/dm', requireAuth, require('./routes/dm'));
  app.use('/api/script', requireAuth, require('./routes/script'));
  app.use('/api/session', requireAuth, require('./routes/session'));
  app.use('/api/salary', requireAuth, require('./routes/salary'));
  app.use('/api/reimbursement', requireAuth, require('./routes/reimbursement'));
  app.use('/api/cashflow', requireAuth, require('./routes/cashflow'));
  app.use('/api/home', requireAuth, require('./routes/home'));

  app.use('/uploads', express.static(config.uploadDir));
  app.use(express.static(path.join(config.rootDir, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(config.rootDir, '../frontend/build', 'index.html'));
  });

  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = config.isProduction && status >= 500 ? '服务器错误' : err.message;
    res.status(status).json({ error: message });
  });

  return app;
}

module.exports = { createApp };
