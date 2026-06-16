const express = require('express');
const router = express.Router();
const db = require('../models');
const multer = require('multer');
const xlsx = require('xlsx');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', async (req, res) => {
  try {
    const { name } = req.query;
    let query = {};
    if (name) {
      query.name = { [db.Sequelize.Op.like]: `%${name}%` };
    }
    const dms = await db.Dm.findAll({ where: query });
    res.json(dms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const dms = await db.Dm.findAll();
    const data = dms.map(dm => ({
      'DM姓名': dm.name,
      '手机号': dm.phone,
      'DM类型': dm.type === 'parttime' ? '打野' : dm.type === 'step' ? '阶梯' : '全职'
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'DM列表');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=dm_list.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const results = { added: 0, updated: 0, skipped: 0 };
    for (const row of data) {
      const existing = await db.Dm.findOne({ where: { phone: row['手机号'] } });
      if (existing) {
        await db.Dm.update({
          name: row['DM姓名'] || existing.name,
          type: row['DM类型'] === '打野' ? 'parttime' : row['DM类型'] === '阶梯' ? 'step' : 'fulltime'
        }, { where: { id: existing.id } });
        results.updated++;
      } else {
        await db.Dm.create({
          name: row['DM姓名'],
          phone: row['手机号'],
          type: row['DM类型'] === '打野' ? 'parttime' : row['DM类型'] === '阶梯' ? 'step' : 'fulltime'
        });
        results.added++;
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const dm = await db.Dm.findByPk(req.params.id);
    if (dm) {
      res.json(dm);
    } else {
      res.status(404).json({ error: 'DM not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const dm = await db.Dm.create(req.body);
    res.json(dm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const [updated] = await db.Dm.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedDm = await db.Dm.findByPk(req.params.id);
      res.json(updatedDm);
    } else {
      res.status(404).json({ error: 'DM not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    await db.Dm.destroy({ where: { id: ids } });
    res.json({ message: 'Batch delete successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.Dm.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ message: 'DM deleted successfully' });
    } else {
      res.status(404).json({ error: 'DM not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
