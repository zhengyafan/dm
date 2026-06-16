const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-sys-salary-test-'));
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

  const dm = await db.Dm.create({ name: '测试DM', phone: '10000000000', type: 'parttime' });
  const script = await db.Script.create({ name: '测试剧本', attribute: 'box' });

  const sessionA = await db.Session.create({
    script_id: script.id,
    dm_id: dm.id,
    session_date: '2026-06-01',
    session_time: '12:00',
    attribute: 'box',
    props_fee: 0,
    praise_count: 0,
    is_settled: true
  });
  const sessionB = await db.Session.create({
    script_id: script.id,
    dm_id: dm.id,
    session_date: '2026-06-16',
    session_time: '12:00',
    attribute: 'box',
    props_fee: 0,
    praise_count: 0,
    is_settled: true
  });

  const settlement = await db.SalarySettlement.create({
    dm_id: dm.id,
    start_date: '2026-06-01',
    end_date: '2026-06-16',
    total_cars: 2,
    ladder_cars: 0,
    base_salary: 300,
    bonus_salary: 0,
    city_extra: 0,
    blood_salary: 0,
    props_total: 0,
    milestone_reward: 0,
    total_salary: 300
  });
  await db.SalarySettlementDetail.bulkCreate([
    { settlement_id: settlement.id, session_id: sessionA.id },
    { settlement_id: settlement.id, session_id: sessionB.id }
  ]);

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

test('home salary follows the selected date range instead of whole overlapping settlements', async () => {
  const fullRange = await request('GET', '/api/home/summary?startDate=2026-06-01&endDate=2026-06-16');
  const singleDay = await request('GET', '/api/home/summary?startDate=2026-06-16&endDate=2026-06-16');

  assert.equal(fullRange.status, 200);
  assert.equal(singleDay.status, 200);
  assert.equal(fullRange.body.totalSalary, 300);
  assert.equal(singleDay.body.totalSalary, 150);
});
