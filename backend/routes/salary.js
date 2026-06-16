const express = require('express');
const router = express.Router();
const db = require('../models');
const xlsx = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { calculateSalaries } = require('../services/salaryCalculator');

router.post('/calculate', async (req, res) => {
  try {
    const { startDate, endDate, dmName } = req.body;
    const results = await calculateSalaries({ startDate, endDate, dmName });
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settle', async (req, res) => {
  try {
    const { startDate, endDate, items } = req.body;
    
    const transaction = await db.sequelize.transaction();
    
    try {
      for (const item of items) {
        const settlement = await db.SalarySettlement.create({
          dm_id: item.dm_id,
          start_date: startDate,
          end_date: endDate,
          total_cars: item.total_cars,
          ladder_cars: item.ladder_cars || 0,
          base_salary: item.base_salary,
          bonus_salary: item.bonus_salary,
          blood_salary: item.blood_salary || 0,
          city_extra: item.city_extra,
          props_total: item.props_total,
          milestone_reward: item.milestone_reward,
          total_salary: item.total_salary,
          remark: item.remark
        }, { transaction });
        
        for (const session of item.sessions) {
          await db.SalarySettlementDetail.create({
            settlement_id: settlement.id,
            session_id: session.id
          }, { transaction });
          
          await db.Session.update(
            { is_settled: true },
            { where: { id: session.id }, transaction }
          );
        }
      }
      
      await transaction.commit();
      res.json({ message: 'Settlement successful' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settlements', async (req, res) => {
  try {
    const { dm_name, start_date, end_date } = req.query;
    
    const include = [{ model: db.Dm, attributes: ['name'] }];
    const where = {};
    
    if (dm_name) {
      const matchingDmIds = await db.Dm.findAll({
        where: {
          name: {
            [db.Sequelize.Op.like]: `%${dm_name}%`
          }
        },
        attributes: ['id']
      }).then(dms => dms.map(dm => dm.id));
      
      if (matchingDmIds.length > 0) {
        where.dm_id = {
          [db.Sequelize.Op.in]: matchingDmIds
        };
      } else {
        where.dm_id = null;
      }
    }
    
    if (start_date && end_date) {
      where.created_at = {
        [db.Sequelize.Op.between]: [`${start_date} 00:00:00`, `${end_date} 23:59:59`]
      };
    }
    
    const settlements = await db.SalarySettlement.findAll({
      include,
      where,
      order: [['created_at', 'DESC']]
    });
    res.json(settlements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/settlements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await db.sequelize.transaction();
    
    try {
      const details = await db.SalarySettlementDetail.findAll({
        where: { settlement_id: id },
        attributes: ['session_id']
      });
      
      const sessionIds = details.map(d => d.session_id);
      
      await db.SalarySettlementDetail.destroy({
        where: { settlement_id: id },
        transaction
      });
      
      await db.SalarySettlement.destroy({
        where: { id },
        transaction
      });
      
      await db.Session.update(
        { is_settled: false },
        { where: { id: sessionIds }, transaction }
      );
      
      await transaction.commit();
      res.json({ message: 'Settlement cancelled successfully' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/template', async (req, res) => {
  try {
    const templateData = [{
      'DM姓名': '张三',
      '结算开始日期': '2026-06-01',
      '结算结束日期': '2026-06-30',
      '总车次': 10,
      '基本工资': 1500.00,
      '好评工资': 100.00,
      '城限提成': 500.00,
      '血染工资': 300.00,
      '开本费总计': 200.00,
      '里程碑奖励': 120.00,
      '总工资': 2720.00,
      '备注': ''
    }];
    
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '工资结算导入模板');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=salary_template.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const settlements = await db.SalarySettlement.findAll({
      include: [{ model: db.Dm, attributes: ['name'] }],
      order: [['created_at', 'DESC']]
    });
    
    const data = settlements.map(s => ({
      'DM姓名': s.Dm?.name || '',
      '结算周期': `${s.start_date} ~ ${s.end_date}`,
      '总车次': s.total_cars,
      '基本工资': s.base_salary,
      '好评工资': s.bonus_salary,
      '城限提成': s.city_extra,
      '血染工资': s.blood_salary,
      '开本费总计': s.props_total,
      '里程碑奖励': s.milestone_reward,
      '总工资': s.total_salary,
      '备注': s.remark || '',
      '结算时间': s.created_at ? new Date(s.created_at).toLocaleString('zh-CN') : ''
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '工资结算记录');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=salary_list.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    const results = {
      added: 0,
      skipped: 0,
      errors: []
    };
    
    const transaction = await db.sequelize.transaction();
    
    try {
      for (const row of data) {
        try {
          const dmName = row['DM姓名'];
          if (!dmName) {
            results.skipped++;
            results.errors.push(`缺少DM姓名: ${JSON.stringify(row)}`);
            continue;
          }
          
          const dm = await db.Dm.findOne({
            where: { name: dmName },
            transaction
          });
          
          if (!dm) {
            results.skipped++;
            results.errors.push(`DM不存在: ${dmName}`);
            continue;
          }
          
          const settlement = await db.SalarySettlement.create({
            dm_id: dm.id,
            start_date: row['结算开始日期'] || new Date().toISOString().split('T')[0],
            end_date: row['结算结束日期'] || new Date().toISOString().split('T')[0],
            total_cars: row['总车次'] || 0,
            ladder_cars: row['阶梯车次'] || 0,
            base_salary: row['基本工资'] || 0,
            bonus_salary: row['好评工资'] || 0,
            blood_salary: row['血染工资'] || 0,
            city_extra: row['城限提成'] || 0,
            props_total: row['开本费总计'] || 0,
            milestone_reward: row['里程碑奖励'] || 0,
            total_salary: row['总工资'] || 0,
            remark: row['备注'] || ''
          }, { transaction });
          
          results.added++;
        } catch (error) {
          results.skipped++;
          results.errors.push(`导入失败：${error.message} - ${JSON.stringify(row)}`);
        }
      }
      
      await transaction.commit();
      res.json(results);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
