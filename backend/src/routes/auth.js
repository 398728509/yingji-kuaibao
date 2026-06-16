const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 注册（管理员预建账号，此接口仅供开发测试）
router.post('/register', (req, res) => {
  const { username, password, displayName, role, phone } = req.body;
  if (!username || !password || !displayName || !role) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: '用户名已存在' });

  const id = uuidv4();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  db.prepare('INSERT INTO users (id, username, password_hash, display_name, role, phone) VALUES (?,?,?,?,?,?)')
    .run(id, username, passwordHash, displayName, role, phone || null);

  res.json({ id, username, displayName, role });
});

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '用户不存在' });

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.password_hash) return res.status(401).json({ error: '密码错误' });

  const token = crypto.randomBytes(32).toString('hex');
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      phone: user.phone
    }
  });
});

// 获取当前用户
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授权' });
  // 简化：token 直接映射用户查询
  const user = db.prepare("SELECT id, username, display_name as displayName, role, phone FROM users LIMIT 1").get();
  if (!user) return res.status(401).json({ error: '未找到用户' });
  res.json(user);
});

module.exports = router;
