const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op, fn, col, literal } = db.Sequelize;
const { calculateSalaryTotal } = require('../services/salaryCalculator');

function createdAtRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return undefined;
  }

  return {
    [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
  };
}

function roundMoney(value) {
  return parseFloat((parseFloat(value) || 0).toFixed(2));
}

router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const cashflowQuery = {};
    const cashflowDateRange = createdAtRange(startDate, endDate);
    if (cashflowDateRange) {
      cashflowQuery.createdAt = cashflowDateRange;
    }

    const [cashflowSummary, salaryResult, sessions, topScriptRows, topDmRows] = await Promise.all([
      db.Cashflow.findOne({
        attributes: [
          [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'totalReceipt'],
          [fn('COALESCE', fn('SUM', col('actual_income')), 0), 'totalCashflow']
        ],
        where: cashflowQuery,
        raw: true
      }),
      startDate && endDate
        ? calculateSalaryTotal({ startDate, endDate, includeSettled: true })
        : db.SalarySettlement.sum('total_salary'),
      db.Session.count({
        where: startDate && endDate ? {
          session_date: { [Op.between]: [startDate, endDate] }
        } : {}
      }),
      db.Session.findAll({
        attributes: [
          'script_id',
          [fn('COUNT', col('Session.id')), 'count']
        ],
        where: startDate && endDate ? {
          session_date: { [Op.between]: [startDate, endDate] }
        } : {},
        include: [{ model: db.Script, attributes: ['name'] }],
        group: ['script_id', 'Script.id'],
        order: [[literal('count'), 'DESC']],
        limit: 1
      }),
      db.Session.findAll({
        attributes: [
          'dm_id',
          [fn('COUNT', col('Session.id')), 'count']
        ],
        where: startDate && endDate ? {
          session_date: { [Op.between]: [startDate, endDate] }
        } : {},
        include: [{ model: db.Dm, attributes: ['name'] }],
        group: ['dm_id', 'Dm.id'],
        order: [[literal('count'), 'DESC']],
        limit: 1
      })
    ]);

    const topScriptRow = topScriptRows[0];
    const topDmRow = topDmRows[0];
    const topScript = topScriptRow
      ? { name: topScriptRow.Script?.name || '未知', count: parseInt(topScriptRow.get('count'), 10) || 0 }
      : { name: '无', count: 0 };
    const topDm = topDmRow
      ? { name: topDmRow.Dm?.name || '未知', count: parseInt(topDmRow.get('count'), 10) || 0 }
      : { name: '无', count: 0 };

    res.json({
      totalCashflow: roundMoney(cashflowSummary?.totalCashflow),
      totalReceipt: roundMoney(cashflowSummary?.totalReceipt),
      totalSalary: roundMoney(salaryResult),
      topScript,
      topDm,
      totalSessions: sessions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push({ month: i, sessions: 0, totalReceipt: 0, actualIncome: 0 });
    }

    const [sessionRows, cashflowRows] = await Promise.all([
      db.Session.findAll({
        attributes: [
          [fn('strftime', '%m', col('session_date')), 'month'],
          [fn('COUNT', col('id')), 'sessions']
        ],
        where: {
          session_date: {
            [Op.between]: [`${targetYear}-01-01`, `${targetYear}-12-31`]
          }
        },
        group: [fn('strftime', '%m', col('session_date'))],
        raw: true
      }),
      db.Cashflow.findAll({
        attributes: [
          [fn('strftime', '%m', col('createdAt')), 'month'],
          [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'totalReceipt'],
          [fn('COALESCE', fn('SUM', col('actual_income')), 0), 'actualIncome']
        ],
        where: {
          createdAt: createdAtRange(`${targetYear}-01-01`, `${targetYear}-12-31`)
        },
        group: [fn('strftime', '%m', col('createdAt'))],
        raw: true
      })
    ]);

    sessionRows.forEach(row => {
      const index = parseInt(row.month, 10) - 1;
      if (index >= 0 && index < 12) {
        months[index].sessions = parseInt(row.sessions, 10) || 0;
      }
    });

    cashflowRows.forEach(row => {
      const index = parseInt(row.month, 10) - 1;
      if (index >= 0 && index < 12) {
        months[index].totalReceipt = roundMoney(row.totalReceipt);
        months[index].actualIncome = roundMoney(row.actualIncome);
      }
    });

    res.json(months);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
