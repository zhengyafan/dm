const express = require('express');
const router = express.Router();
const db = require('../models');
const multer = require('multer');
const xlsx = require('xlsx');
const { Op, fn, col } = db.Sequelize;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

function createdAtRange(startDate, endDate) {
  return {
    [Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
  };
}

function monthDateRange(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0).toISOString().split('T')[0];
  return createdAtRange(startDate, endDate);
}

router.get('/', async (req, res) => {
  try {
    const { scriptName, year, month } = req.query;
    let query = {};
    if (scriptName) {
      query.script_name = { [db.Sequelize.Op.like]: `%${scriptName}%` };
    }
    if (year && month) {
      query.createdAt = monthDateRange(year, month);
    }
    const cashflows = await db.Cashflow.findAll({
      where: query,
      order: [['createdAt', 'DESC']]
    });
    res.json(cashflows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate, scriptName, year, month } = req.query;
    let query = {};
    
    if (scriptName) {
      query.script_name = { [Op.like]: `%${scriptName}%` };
    }
    
    if (year && month) {
      query.createdAt = monthDateRange(year, month);
    } else if (startDate && endDate) {
      query.createdAt = createdAtRange(startDate, endDate);
    }
    
    const summary = await db.Cashflow.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'totalAmount'],
        [fn('COALESCE', fn('SUM', col('actual_income')), 0), 'actualIncome'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: query,
      raw: true
    });
    
    res.json({ 
      totalAmount: (parseFloat(summary.totalAmount) || 0).toFixed(2),
      actualIncome: (parseFloat(summary.actualIncome) || 0).toFixed(2),
      count: parseInt(summary.count, 10) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/template', async (req, res) => {
  try {
    const templateData = [{
      '剧本名称': '硬币的第四面',
      '开本日期': '2026-06-15',
      '美团金额': 500.00,
      '美团抽成': 0.90,
      '谜圈金额': 300.00,
      '谜圈抽成': 0.92,
      '微信金额': 200.00,
      '总收款': 1000.00,
      '实际收入': 926.00,
      '备注': ''
    }];
    
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '流水记录导入模板');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cashflow_template.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const cashflows = await db.Cashflow.findAll();
    const data = cashflows.map(c => ({
      '剧本名称': c.script_name,
      '开本日期': c.session_date ? new Date(c.session_date).toLocaleDateString('zh-CN') : '',
      '美团金额': c.meituan_amount,
      '美团抽成': c.meituan_rate,
      '谜圈金额': c.miquan_amount,
      '谜圈抽成': c.miquan_rate,
      '微信金额': c.wechat_amount,
      '总收款': c.total_amount,
      '实际收入': c.actual_income,
      '备注': c.remark || ''
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '流水记录');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cashflow_list.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cashflow = await db.Cashflow.findByPk(req.params.id);
    if (cashflow) {
      res.json(cashflow);
    } else {
      res.status(404).json({ error: 'Cashflow not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { meituan_amount, meituan_rate, miquan_amount, miquan_rate, wechat_amount } = req.body;
    
    const total_amount = (parseFloat(meituan_amount) || 0) + (parseFloat(miquan_amount) || 0) + (parseFloat(wechat_amount) || 0);
    const actual_income = ((parseFloat(meituan_amount) || 0) * (parseFloat(meituan_rate) || 0)) + ((parseFloat(miquan_amount) || 0) * (parseFloat(miquan_rate) || 0)) + (parseFloat(wechat_amount) || 0);
    
    const cashflow = await db.Cashflow.create({
      ...req.body,
      total_amount,
      actual_income
    });
    res.json(cashflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { meituan_amount, meituan_rate, miquan_amount, miquan_rate, wechat_amount } = req.body;
    
    const total_amount = (parseFloat(meituan_amount) || 0) + (parseFloat(miquan_amount) || 0) + (parseFloat(wechat_amount) || 0);
    const actual_income = ((parseFloat(meituan_amount) || 0) * (parseFloat(meituan_rate) || 0)) + ((parseFloat(miquan_amount) || 0) * (parseFloat(miquan_rate) || 0)) + (parseFloat(wechat_amount) || 0);
    
    const [updated] = await db.Cashflow.update({
      ...req.body,
      total_amount,
      actual_income
    }, { where: { id: req.params.id } });
    if (updated) {
      const updatedCashflow = await db.Cashflow.findByPk(req.params.id);
      res.json(updatedCashflow);
    } else {
      res.status(404).json({ error: 'Cashflow not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    await db.Cashflow.destroy({ where: { id: ids } });
    res.json({ message: 'Batch delete successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.Cashflow.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ message: 'Cashflow deleted successfully' });
    } else {
      res.status(404).json({ error: 'Cashflow not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const results = { added: 0, updated: 0, skipped: 0, errors: [] };
    for (const row of data) {
      try {
        // 验证必填字段
        if (!row['剧本名称']) {
          results.skipped++;
          results.errors.push(`跳过记录：缺少剧本名称 - ${JSON.stringify(row)}`);
          continue;
        }
        
        // 处理开本日期
        let sessionDate = null;
        if (row['开本日期']) {
          sessionDate = new Date(row['开本日期']);
          if (isNaN(sessionDate.getTime())) {
            sessionDate = null;
          }
        }
        
        // 计算总收款和实际收入
        const meituanAmount = parseFloat(row['美团金额']) || 0;
        const meituanRate = parseFloat(row['美团抽成']) || 0;
        const miquanAmount = parseFloat(row['谜圈金额']) || 0;
        const miquanRate = parseFloat(row['谜圈抽成']) || 0;
        const wechatAmount = parseFloat(row['微信金额']) || 0;
        
        const totalAmount = meituanAmount + miquanAmount + wechatAmount;
        const actualIncome = (meituanAmount * meituanRate) + (miquanAmount * miquanRate) + wechatAmount;
        
        await db.Cashflow.create({
          script_name: row['剧本名称'],
          session_date: sessionDate,
          meituan_amount: meituanAmount,
          meituan_rate: meituanRate,
          miquan_amount: miquanAmount,
          miquan_rate: miquanRate,
          wechat_amount: wechatAmount,
          total_amount: totalAmount,
          actual_income: actualIncome,
          remark: row['备注'] || ''
        });
        results.added++;
      } catch (error) {
        results.skipped++;
        results.errors.push(`导入失败：${error.message} - ${JSON.stringify(row)}`);
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
