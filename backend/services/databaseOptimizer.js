const db = require('../models');

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_session_date ON session(session_date)',
  'CREATE INDEX IF NOT EXISTS idx_session_dm_id ON session(dm_id)',
  'CREATE INDEX IF NOT EXISTS idx_session_script_id ON session(script_id)',
  'CREATE INDEX IF NOT EXISTS idx_session_settled ON session(is_settled)',
  'CREATE INDEX IF NOT EXISTS idx_session_date_dm ON session(session_date, dm_id)',
  'CREATE INDEX IF NOT EXISTS idx_session_date_script ON session(session_date, script_id)',
  'CREATE INDEX IF NOT EXISTS idx_cashflow_created_at ON cashflow(createdAt)',
  'CREATE INDEX IF NOT EXISTS idx_cashflow_script_name ON cashflow(script_name)',
  'CREATE INDEX IF NOT EXISTS idx_reimbursement_date ON reimbursement(reimburse_date)',
  'CREATE INDEX IF NOT EXISTS idx_reimbursement_person ON reimbursement(person)',
  'CREATE INDEX IF NOT EXISTS idx_salary_settlement_dm ON salary_settlement(dm_id)',
  'CREATE INDEX IF NOT EXISTS idx_salary_settlement_period ON salary_settlement(start_date, end_date)',
  'CREATE INDEX IF NOT EXISTS idx_salary_detail_session ON salary_settlement_detail(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_salary_detail_settlement ON salary_settlement_detail(settlement_id)',
  'CREATE INDEX IF NOT EXISTS idx_script_name ON script(name)',
  'CREATE INDEX IF NOT EXISTS idx_dm_name ON dm(name)',
  'CREATE INDEX IF NOT EXISTS idx_user_username ON users(username)'
];

async function optimizeDatabase() {
  await db.sequelize.query('PRAGMA journal_mode = WAL;');
  await db.sequelize.query('PRAGMA synchronous = NORMAL;');
  await db.sequelize.query('PRAGMA busy_timeout = 5000;');

  for (const sql of INDEXES) {
    await db.sequelize.query(sql);
  }
}

module.exports = { optimizeDatabase };
