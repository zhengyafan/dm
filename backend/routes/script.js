const express = require('express');
const router = express.Router();
const db = require('../models');
const multer = require('multer');
const xlsx = require('xlsx');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.get('/', async (req, res) => {
  try {
    const { name, attribute, genre } = req.query;
    let query = {};
    if (name) {
      query.name = { [db.Sequelize.Op.like]: `%${name}%` };
    }
    if (attribute) {
      query.attribute = attribute;
    }
    if (genre) {
      query.genre = { [db.Sequelize.Op.like]: `%${genre}%` };
    }
    const scripts = await db.Script.findAll({ where: query });
    res.json(scripts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/template', async (req, res) => {
  try {
    const templateData = [
      {
        '剧本名称': '硬币的第四面',
        '剧本属性': '城限',
        '类型': '推理',
        '剧本人数': 6
      },
      {
        '剧本名称': '如月街第七号',
        '剧本属性': '盒装',
        '类型': '恐怖',
        '剧本人数': 6
      }
    ];
    
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '剧本导入模板');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=script_import_template.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const scripts = await db.Script.findAll();
    const data = scripts.map(script => ({
      '剧本名称': script.name,
      '剧本属性': script.attribute === 'box' ? '盒装' : '城限',
      '类型': script.genre,
      '剧本人数': script.player_num
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '剧本列表');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=script_list.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const script = await db.Script.findByPk(req.params.id);
    if (script) {
      res.json(script);
    } else {
      res.status(404).json({ error: 'Script not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const script = await db.Script.create(req.body);
    res.json(script);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const [updated] = await db.Script.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedScript = await db.Script.findByPk(req.params.id);
      res.json(updatedScript);
    } else {
      res.status(404).json({ error: 'Script not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    await db.Script.destroy({ where: { id: ids } });
    res.json({ message: 'Batch delete successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.Script.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ message: 'Script deleted successfully' });
    } else {
      res.status(404).json({ error: 'Script not found' });
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
    
    const results = { added: 0, updated: 0, skipped: 0 };
    for (const row of data) {
      const scriptName = row['剧本名称'];
      const scriptAttribute = row['剧本属性'];
      
      if (!scriptName || !scriptAttribute) {
        results.skipped++;
        continue;
      }
      
      const existing = await db.Script.findOne({ where: { name: scriptName } });
      const attributeValue = scriptAttribute === '盒装' ? 'box' : 'city';
      
      if (existing) {
        await db.Script.update({
          attribute: attributeValue,
          genre: row['类型'] || existing.genre || '',
          player_num: row['剧本人数'] ? parseInt(row['剧本人数']) : existing.player_num || 0,
          price: existing.price || 0
        }, { where: { id: existing.id } });
        results.updated++;
      } else {
        await db.Script.create({
          name: scriptName,
          attribute: attributeValue,
          genre: row['类型'] || '',
          player_num: row['剧本人数'] ? parseInt(row['剧本人数']) : 0,
          price: 0
        });
        results.added++;
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
