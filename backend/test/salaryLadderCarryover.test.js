const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-sys-ladder-test-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(tempDir, 'database.sqlite');
process.env.JWT_SECRET = 'test-secret-with-enough-length-for-jwt';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'secret123';

const db = require('../models');
const { calculateSalaries } = require('../services/salaryCalculator');

test.beforeEach(async () => {
  await db.sequelize.sync({ force: true });
});

test.after(async () => {
  await db.sequelize.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('settled cars in the same calculation month advance the ladder without being paid again', async () => {
  const dm = await db.Dm.create({ name: '拾贰', phone: '10000000000', type: 'fulltime' });
  const script = await db.Script.create({ name: '普通剧本', attribute: 'box' });

  const settledSessions = [];
  for (let day = 1; day <= 4; day++) {
    settledSessions.push(await db.Session.create({
      script_id: script.id,
      dm_id: dm.id,
      session_date: `2026-06-0${day}`,
      session_time: '12:00',
      attribute: 'box',
      is_settled: true
    }));
  }

  const settlement = await db.SalarySettlement.create({
    dm_id: dm.id,
    start_date: '2026-06-01',
    end_date: '2026-06-15',
    total_cars: 4,
    ladder_cars: 4,
    base_salary: 520,
    bonus_salary: 0,
    city_extra: 0,
    blood_salary: 0,
    props_total: 0,
    milestone_reward: 0,
    total_salary: 520
  });

  await db.SalarySettlementDetail.bulkCreate(settledSessions.map(session => ({
    settlement_id: settlement.id,
    session_id: session.id
  })));

  await db.Session.create({
    script_id: script.id,
    dm_id: dm.id,
    session_date: '2026-06-16',
    session_time: '12:00',
    attribute: 'box',
    is_settled: false
  });

  const results = await calculateSalaries({
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    dmName: '拾贰'
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].total_before, 4);
  assert.equal(results[0].total_cars, 1);
  assert.equal(results[0].base_salary, 160);
  assert.equal(results[0].milestone_reward, 120);
  assert.deepEqual(results[0].ladder_details.map(item => item.car_index), [5]);
});

test('blood sessions count toward ladder car indexes', async () => {
  const dm = await db.Dm.create({ name: '拾贰', phone: '10000000000', type: 'fulltime' });
  const normalScript = await db.Script.create({ name: '普通剧本', attribute: 'box' });
  const bloodScript = await db.Script.create({ name: '血染钟楼', attribute: 'box' });

  const settledSessions = [];
  for (let day = 1; day <= 4; day++) {
    settledSessions.push(await db.Session.create({
      script_id: normalScript.id,
      dm_id: dm.id,
      session_date: `2026-06-0${day}`,
      session_time: '12:00',
      attribute: 'box',
      is_settled: true
    }));
  }

  const settlement = await db.SalarySettlement.create({
    dm_id: dm.id,
    start_date: '2026-06-01',
    end_date: '2026-06-15',
    total_cars: 4,
    ladder_cars: 4,
    base_salary: 520,
    bonus_salary: 0,
    city_extra: 0,
    blood_salary: 0,
    props_total: 0,
    milestone_reward: 0,
    total_salary: 520
  });

  await db.SalarySettlementDetail.bulkCreate(settledSessions.map(session => ({
    settlement_id: settlement.id,
    session_id: session.id
  })));

  await db.Session.create({
    script_id: bloodScript.id,
    dm_id: dm.id,
    session_date: '2026-06-16',
    session_time: '12:00',
    attribute: 'box',
    is_settled: false
  });

  const results = await calculateSalaries({
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    dmName: '拾贰'
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].total_before, 4);
  assert.equal(results[0].blood_cars, 1);
  assert.equal(results[0].ladder_cars, 1);
  assert.equal(results[0].base_salary, 0);
  assert.equal(results[0].blood_salary, 150);
  assert.equal(results[0].milestone_reward, 120);
  assert.deepEqual(results[0].ladder_details.map(item => item.car_index), [5]);
  assert.equal(results[0].total_salary, 270);
});
