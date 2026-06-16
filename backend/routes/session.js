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
    const { startDate, endDate, dmId, scriptName } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.session_date = {
        [db.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    if (dmId) {
      query.dm_id = dmId;
    }
    
    const scriptInclude = { model: db.Script, attributes: ['name'] };
    if (scriptName) {
      scriptInclude.where = {
        name: { [db.Sequelize.Op.like]: `%${scriptName}%` }
      };
      scriptInclude.required = true;
    }

    const sessions = await db.Session.findAll({
      where: query,
      include: [
        { model: db.Dm, attributes: ['name'] },
        scriptInclude
      ],
      order: [['session_date', 'DESC'], ['session_time', 'DESC']]
    });

    res.json(sessions);
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
        '开本日期': '2025-06-15',
        '开本时间': '14:00',
        '开本费': 80,
        '好评数量': 5,
        'DM姓名': '张三',
        '备注': ''
      }
    ];
    
    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '开本记录导入模板');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=session_import_template.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const sessions = await db.Session.findAll({
      include: [
        { model: db.Dm, attributes: ['name'] },
        { model: db.Script, attributes: ['name'] }
      ]
    });
    
    const data = sessions.map(session => ({
      '剧本名称': session.Script?.name || '',
      '开本日期': session.session_date,
      '开本时间': session.session_time,
      '剧本属性': session.attribute === 'box' ? '盒装' : '城限',
      '开本费': session.props_fee,
      '好评数量': session.praise_count || 0,
      'DM姓名': session.Dm?.name || '',
      '备注': session.remark || ''
    }));
    
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '开本记录列表');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=session_list.xlsx');
    res.send(xlsx.write(workbook, { type: 'buffer' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const session = await db.Session.findByPk(req.params.id, {
      include: [
        { model: db.Dm, attributes: ['name'] },
        { model: db.Script, attributes: ['name'] }
      ]
    });
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const script = await db.Script.findByPk(req.body.script_id);
    const session = await db.Session.create({
      ...req.body,
      attribute: script.attribute
    });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.body.script_id) {
      const script = await db.Script.findByPk(req.body.script_id);
      req.body.attribute = script.attribute;
    }
    const [updated] = await db.Session.update(req.body, { where: { id: req.params.id } });
    if (updated) {
      const updatedSession = await db.Session.findByPk(req.params.id);
      res.json(updatedSession);
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    await db.Session.destroy({ where: { id: ids } });
    res.json({ message: 'Batch delete successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.Session.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ message: 'Session deleted successfully' });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatExcelDate(dateValue) {
  if (!dateValue) return null;
  
  console.log(`formatExcelDate - 输入值: ${dateValue}, 类型: ${typeof dateValue}`);
  
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    console.log(`formatExcelDate - 字符串值: "${trimmed}"`);
    
    const patterns = [
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
      /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
      /^(\d{4})年(\d{1,2})月(\d{1,2})日?/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}):(\d{2}):(\d{2})/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z/
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        let year, month, day;
        if (pattern === patterns[0]) {
          year = match[1];
          month = String(match[2]).padStart(2, '0');
          day = String(match[3]).padStart(2, '0');
        } else if (pattern === patterns[1]) {
          if (parseInt(match[3]) > 12) {
            year = match[3];
            month = String(match[1]).padStart(2, '0');
            day = String(match[2]).padStart(2, '0');
          } else {
            year = match[3];
            month = String(match[2]).padStart(2, '0');
            day = String(match[1]).padStart(2, '0');
          }
        } else if (pattern === patterns[2]) {
          year = match[1];
          month = String(match[2]).padStart(2, '0');
          day = String(match[3]).padStart(2, '0');
        } else if (pattern === patterns[3] || pattern === patterns[4]) {
          year = match[1];
          month = String(match[2]).padStart(2, '0');
          day = String(match[3]).padStart(2, '0');
        }
        
        if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
          const result = `${year}-${month}-${day}`;
          console.log(`formatExcelDate - 解析成功: ${result}`);
          return result;
        }
      }
    }
    
    console.log(`formatExcelDate - 字符串格式不匹配`);
    return null;
  }
  
  if (typeof dateValue === 'number') {
    console.log(`formatExcelDate - Excel日期序列号: ${dateValue}`);
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const result = `${year}-${month}-${day}`;
    console.log(`formatExcelDate - 序列号转换结果: ${result}`);
    return result;
  }
  
  if (dateValue instanceof Date) {
    console.log(`formatExcelDate - Date对象: ${dateValue.toISOString()}`);
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    const result = `${year}-${month}-${day}`;
    console.log(`formatExcelDate - Date对象转换结果: ${result}`);
    return result;
  }
  
  console.log(`formatExcelDate - 无法处理的类型`);
  return null;
}

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    console.log('开始导入开本记录...');
    
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }
    
    const workbook = xlsx.read(req.file.buffer, { 
      type: 'buffer', 
      cellDates: true,
      codepage: 936
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log('读取到数据行数:', data.length);
    if (data.length === 0) {
      return res.status(400).json({ error: '文件中没有数据' });
    }
    
    const results = { added: 0, updated: 0, skipped: 0, errors: [], debug: [] };
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      
      console.log(`处理第${rowNum}行数据:`, JSON.stringify(row));
      
      const scriptName = row['剧本名称'] || row['鍓ф湰鍚嶇О'];
      const scriptAttribute = row['剧本属性'] || row['鍓ф湰灞炴€?'];
      const rawDate = row['开本日期'] || row['寮€鏈棩鏈?'];
      const sessionDate = formatExcelDate(rawDate);
      const sessionTime = row['开本时间'] || row['寮€鏈鏃堕棿'] || '12:00';
      const propsFee = row['开本费'] || row['寮€鏈垂'];
      const praiseCount = row['好评数量'] || row['濂界敤鏁伴噺'] || 0;
      const dmName = row['DM姓名'] || row['DM濮撳悕'];
      const remark = row['备注'] || row['澶囨敞'];
      
      const debugInfo = `第${rowNum}行 - 剧本名称:${scriptName}, 剧本属性:${scriptAttribute}, 开本日期(raw):${rawDate}, 开本日期(formatted):${sessionDate}, 开本时间:${sessionTime}, 开本费:${propsFee}, DM姓名:${dmName}`;
      results.debug.push(debugInfo);
      
      if (!scriptName) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：缺少剧本名称`);
        continue;
      }
      
      if (!scriptAttribute) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：缺少剧本属性（盒装/城限）`);
        continue;
      }
      
      if (!sessionDate) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：开本日期格式不正确，请使用YYYY-MM-DD格式`);
        continue;
      }
      
      if (!dmName) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：缺少DM姓名`);
        continue;
      }
      
      const script = await db.Script.findOne({ where: { name: scriptName } });
      const dm = await db.Dm.findOne({ where: { name: dmName } });
      
      if (!script) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：剧本「${scriptName}」不存在于系统中，请先在本单管理中添加`);
        continue;
      }
      
      if (!dm) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：DM「${dmName}」不存在于系统中，请先在DM管理中添加`);
        continue;
      }
      
      try {
        await db.Session.create({
          script_id: script.id,
          dm_id: dm.id,
          session_date: sessionDate,
          session_time: sessionTime || '12:00',
          attribute: script.attribute,
          props_fee: parseFloat(propsFee) || 0,
          praise_count: parseInt(praiseCount) || 0,
          remark: remark || ''
        });
        results.added++;
        console.log(`第${rowNum}行导入成功`);
      } catch (createError) {
        results.skipped++;
        results.errors.push(`第${rowNum}行：创建失败 - ${createError.message}`);
        console.error(`第${rowNum}行创建失败:`, createError.message);
      }
    }
    
    console.log('导入完成:', JSON.stringify(results));
    res.json(results);
  } catch (err) {
    console.error('导入过程发生错误:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
