const crypto = require('crypto');
const db = require('../models');
const { config } = require('../config');

const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = 'sha512';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function parseExpiresIn(value) {
  const match = String(value).match(/^(\d+)([smhd])$/);
  if (!match) {
    return 7 * 24 * 60 * 60;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60
  };

  return amount * multipliers[unit];
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    is_active: user.is_active
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString('hex'));
    });
  });

  return `pbkdf2$${HASH_ITERATIONS}$${salt}$${hash}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, iterations, salt, expectedHash] = String(passwordHash).split('$');
  if (algorithm !== 'pbkdf2' || !iterations || !salt || !expectedHash) {
    return false;
  }

  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, Number(iterations), HASH_KEY_LENGTH, HASH_DIGEST, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey.toString('hex'));
    });
  });

  return timingSafeEqualString(hash, expectedHash);
}

function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: String(user.id),
    username: user.username,
    iat: now,
    exp: now + parseExpiresIn(config.jwtExpiresIn)
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  if (!timingSafeEqualString(signature, expectedSignature)) {
    throw new Error('Invalid token');
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Expired token');
  }

  return payload;
}

async function login(username, password) {
  const user = await db.User.findOne({ where: { username, is_active: true } });
  if (!user) {
    return null;
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return null;
  }

  return {
    token: signToken(user),
    user: safeUser(user)
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await db.User.findOne({
    where: {
      id: userId,
      is_active: true
    }
  });

  if (!user) {
    const error = new Error('用户不存在或已停用');
    error.status = 404;
    throw error;
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    const error = new Error('当前密码错误');
    error.status = 400;
    throw error;
  }

  user.password_hash = await hashPassword(newPassword);
  await user.save();

  return safeUser(user);
}

async function seedInitialAdmin() {
  const userCount = await db.User.count();
  if (userCount > 0) {
    return null;
  }

  if (!config.adminUsername || !config.adminPassword) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD are required when no users exist.');
  }

  const user = await db.User.create({
    username: config.adminUsername,
    display_name: config.adminUsername,
    password_hash: await hashPassword(config.adminPassword),
    is_active: true
  });

  return safeUser(user);
}

module.exports = {
  changePassword,
  hashPassword,
  login,
  safeUser,
  seedInitialAdmin,
  signToken,
  verifyPassword,
  verifyToken
};
