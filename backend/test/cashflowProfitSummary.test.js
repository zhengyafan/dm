const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-sys-cashflow-test-'));
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
let token;

async function request(method, pathname, { body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
}

test.before(async () => {
  await db.sequelize.sync({ force: true });
  await seedInitialAdmin();

  const dm = await db.Dm.create({ name: '测试DM', phone: '10000000000', type: 'fulltime' });
  await db.Cashflow.create({
    script_name: '测试剧本',
    session_date: '2026-06-10',
    meituan_amount: 100,
    meituan_rate: 0.8,
    miquan_amount: 50,
    miquan_rate: 0.9,
    wechat_amount: 25,
    total_amount: 175,
    actual_income: 150,
    createdAt: '2026-06-10 12:00:00',
    updatedAt: '2026-06-10 12:00:00'
  });
  await db.SalarySettlement.create({
    dm_id: dm.id,
    start_date: '2026-06-01',
    end_date: '2026-06-15',
    total_cars: 1,
    ladder_cars: 1,
    base_salary: 100,
    bonus_salary: 0,
    city_extra: 0,
    blood_salary: 0,
    props_total: 0,
    milestone_reward: 0,
    total_salary: 100
  });

  const app = createApp();
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'secret123' }
  });
  token = login.body.token;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await db.sequelize.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('cashflow summary includes paid salary and gross profit for the selected period', async () => {
  const response = await request('GET', '/api/cashflow/summary?year=2026&month=6');

  assert.equal(response.status, 200);
  assert.equal(response.body.actualIncome, '150.00');
  assert.equal(response.body.paidSalary, '100.00');
  assert.equal(response.body.grossProfit, '50.00');
});
