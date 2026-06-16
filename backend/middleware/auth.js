const db = require('../models');
const { safeUser, verifyToken } = require('../services/authService');

async function requireAuth(req, res, next) {
  try {
    const header = req.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: '请先登录' });
    }

    const payload = verifyToken(match[1]);
    const user = await db.User.findOne({
      where: {
        id: payload.sub,
        is_active: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: '登录已失效，请重新登录' });
    }

    req.user = safeUser(user);
    return next();
  } catch (err) {
    return res.status(401).json({ error: '登录已失效，请重新登录' });
  }
}

module.exports = { requireAuth };
