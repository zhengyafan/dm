const express = require('express');
const { changePassword, login } = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入账号和密码' });
    }

    const result = await login(String(username).trim(), String(password));
    if (!result) {
      return res.status(401).json({ error: '账号或密码错误' });
    }

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '请输入当前密码和新密码' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: '新密码至少需要 8 位' });
    }

    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({ error: '新密码不能与当前密码相同' });
    }

    const user = await changePassword(req.user.id, String(currentPassword), String(newPassword));
    return res.json({ message: '密码修改成功', user });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
