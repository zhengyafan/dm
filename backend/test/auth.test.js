const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-sys-test-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(tempDir, 'database.sqlite');
process.env.JWT_SECRET = 'test-secret-with-enough-length-for-jwt';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'secret123';

const db = require('../models');
const { createApp } = require('../app');
const { seedInitialAdmin } = require('../services/authService');

let server;
let baseUrl;

async function request(method, pathname, { body, token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body: json
  };
}

test.before(async () => {
  await db.sequelize.sync({ force: true });
  await seedInitialAdmin();

  const app = createApp();
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await db.sequelize.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('business APIs require authentication', async () => {
  const response = await request('GET', '/api/home/summary');

  assert.equal(response.status, 401);
});

test('login rejects wrong password', async () => {
  const response = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'wrong' }
  });

  assert.equal(response.status, 401);
});

test('login returns token and current user for valid credentials', async () => {
  const login = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'secret123' }
  });

  assert.equal(login.status, 200);
  assert.equal(login.body.user.username, 'admin');
  assert.equal(typeof login.body.token, 'string');

  const me = await request('GET', '/api/auth/me', {
    token: login.body.token
  });

  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, 'admin');
});

test('authenticated user can change password', async () => {
  const login = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'secret123' }
  });

  const change = await request('PUT', '/api/auth/password', {
    token: login.body.token,
    body: {
      currentPassword: 'secret123',
      newPassword: 'newSecret123'
    }
  });

  assert.equal(change.status, 200);

  const oldLogin = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'secret123' }
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'newSecret123' }
  });
  assert.equal(newLogin.status, 200);
});

test('admin can log in with the default password after password changes', async () => {
  const login = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'admin' }
  });

  assert.equal(login.status, 200);
  assert.equal(login.body.user.username, 'admin');
});

test('business APIs allow valid token', async () => {
  const login = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'newSecret123' }
  });

  const response = await request('GET', '/api/home/summary', {
    token: login.body.token
  });

  assert.equal(response.status, 200);
});
