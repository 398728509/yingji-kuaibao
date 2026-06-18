const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { generateToken, authMiddleware, requireRole } = require('../middleware/auth');

// 注册（管理员预建账号）
router.post('/register', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, displayName, role, phone } = req.body;
    if (!username || !password || !displayName || !role) {
      return res.status(400).json({ error: '缺少必要字段：username, password, displayName, role' });
    }

    const validRoles = ['admin', 'reporter', 'reviewer', 'commander'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: '角色无效，必须为：' + validRoles.join('/') });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: '用户名已存在' });

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare('INSERT INTO users (id, username, password_hash, display_name, role, phone) VALUES (?,?,?,?,?,?)')
      .run(id, username, passwordHash, displayName, role, phone || null);

    const user = { id, username, display_name: displayName, role, phone: phone || null };
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        phone: user.phone,
        unit: user.unit
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active');
    if (!user) return res.status(401).json({ error: '用户名或密码错误' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        phone: user.phone,
        unit: user.unit
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare("SELECT id, username, display_name as displayName, role, phone, unit, status, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// 刷新 Token
router.post('/refresh', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const token = generateToken(user);
  res.json({ token });
});

// 修改密码
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: '旧密码错误' });

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(newHash, req.user.id);

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});


// 修改个人资料
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { displayName, phone, unit } = req.body;
    if (!displayName) return res.status(400).json({ error: '姓名不能为空' });
    db.prepare("UPDATE users SET display_name = ?, phone = ?, unit = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(displayName, phone || null, unit || null, req.user.id);
    const user = db.prepare("SELECT id, username, display_name as displayName, role, phone, unit, status FROM users WHERE id = ?").get(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    console.error('更新个人资料失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

module.exports = router;
