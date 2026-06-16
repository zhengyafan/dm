const express = require('express');
const router = express.Router();
const db = require('../models');
const multer = require('multer');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { config } = require('../config');

const uploadsDir = path.join(config.uploadDir, 'reimbursement');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('只允许上传图片文件（jpeg, jpg, png, gif）'));
  }
 });

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, person } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.reimburse_date = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    if (person) {
      query.person = { [db.Sequelize.Op.like]: `%${person}%` };
    }
    const reimbursements = await db.Reimbursement.findAll({
      where: query,
      order: [['reimburse_date', 'DESC']]
    });
    res.json(reimbursements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate, person } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.reimburse_date = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    if (person) {
      query.person = { [db.Sequelize.Op.like]: `%${person}%` };
    }
    
    const result = await db.Reimbursement.sum('total_amount', { where: query });
    res.json({ total: result || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/template', async (req, res) => {
  try {
    const templateData = [{
      '报销原因': '购买办公用品',
      '报销人': '张三',
      '报销时间': '2024-06-16',
      '报销物品': 'A4纸',
      '单价': 25.00,
      '数量': 2,
      '金额': 50.00,
      '截图信息': ''
    }];
    
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '报销记录导入模板');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reimbursement_template.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const reimbursements = await db.Reimbursement.findAll();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('报销记录');
    
    // 设置列宽
    worksheet.columns = [
      { header: '报销原因', key: 'reason', width: 20 },
      { header: '报销人', key: 'person', width: 15 },
      { header: '报销时间', key: 'reimburse_date', width: 15 },
      { header: '报销物品', key: 'item', width: 20 },
      { header: '单价', key: 'unit_price', width: 10 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '报销金额', key: 'total_amount', width: 12 },
      { header: '截图', key: 'screenshot', width: 15 }
    ];
    
    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // 添加数据行
    for (let i = 0; i < reimbursements.length; i++) {
      const r = reimbursements[i];
      const row = worksheet.addRow({
        reason: r.reason,
        person: r.person,
        reimburse_date: r.reimburse_date,
        item: r.item,
        unit_price: r.unit_price,
        quantity: r.quantity,
        total_amount: r.total_amount,
        screenshot: r.screenshot_path ? '有截图' : '无截图'
      });
      
      // 如果有截图，添加图片
      if (r.screenshot_path) {
        try {
          const imagePath = path.join(uploadsDir, path.basename(r.screenshot_path));
          if (fs.existsSync(imagePath)) {
            const imageId = workbook.addImage({
              filename: imagePath,
              extension: path.extname(imagePath).substring(1)
            });
            
            // 设置图片大小和位置
            const cell = worksheet.getCell(`H${i + 2}`);
            worksheet.addImage(imageId, {
              tl: { col: 7, row: i + 1 },
              ext: { width: 100, height: 80 }
            });
            
            // 调整行高以适应图片
            worksheet.getRow(i + 2).height = 80;
          }
        } catch (error) {
          console.error(`Error adding image for reimbursement ${r.id}:`, error.message);
        }
      }
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reimbursement_list.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const reimbursement = await db.Reimbursement.findByPk(req.params.id);
    if (reimbursement) {
      res.json(reimbursement);
    } else {
      res.status(404).json({ error: 'Reimbursement not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('screenshot'), async (req, res) => {
  try {
    const { unit_price, quantity } = req.body;
    const total_amount = parseFloat(unit_price || 0) * parseInt(quantity || 1);
    
    const data = {
      ...req.body,
      total_amount
    };
    
    if (req.file) {
      data.screenshot_path = `/uploads/reimbursement/${req.file.filename}`;
    }
    
    const reimbursement = await db.Reimbursement.create(data);
    res.json(reimbursement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', upload.single('screenshot'), async (req, res) => {
  try {
    const { unit_price, quantity } = req.body;
    const total_amount = parseFloat(unit_price || 0) * parseInt(quantity || 1);
    
    const data = {
      ...req.body,
      total_amount
    };
    
    if (req.file) {
      data.screenshot_path = `/uploads/reimbursement/${req.file.filename}`;
    }
    
    const [updated] = await db.Reimbursement.update(data, { where: { id: req.params.id } });
    if (updated) {
      const updatedReimbursement = await db.Reimbursement.findByPk(req.params.id);
      res.json(updatedReimbursement);
    } else {
      res.status(404).json({ error: 'Reimbursement not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    await db.Reimbursement.destroy({ where: { id: ids } });
    res.json({ message: 'Batch delete successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.Reimbursement.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ message: 'Reimbursement deleted successfully' });
    } else {
      res.status(404).json({ error: 'Reimbursement not found' });
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
        if (!row['报销原因'] || !row['报销人'] || !row['报销时间'] || !row['报销物品'] || !row['单价'] || !row['数量']) {
          results.skipped++;
          results.errors.push(`跳过记录：缺少必填字段 - ${JSON.stringify(row)}`);
          continue;
        }
        
        // 处理日期格式
        let reimburseDate = row['报销时间'];
        if (typeof reimburseDate === 'number') {
          // Excel日期序列号转换
          const excelDate = new Date(Math.round((reimburseDate - 25569) * 86400 * 1000));
          reimburseDate = excelDate.toISOString().split('T')[0];
        } else if (typeof reimburseDate === 'string') {
          // 处理字符串日期
          const dateObj = new Date(reimburseDate);
          if (!isNaN(dateObj.getTime())) {
            reimburseDate = dateObj.toISOString().split('T')[0];
          }
        }
        
        await db.Reimbursement.create({
          reason: row['报销原因'],
          person: row['报销人'],
          reimburse_date: reimburseDate,
          item: row['报销物品'],
          unit_price: parseFloat(row['单价']) || 0,
          quantity: parseInt(row['数量']) || 1,
          total_amount: (parseFloat(row['单价']) || 0) * (parseInt(row['数量']) || 1),
          screenshot_info: row['截图信息'] || ''
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
