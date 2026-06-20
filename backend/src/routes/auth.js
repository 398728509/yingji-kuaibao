const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { generateToken, authMiddleware, requireRole } = require('../middleware/auth');

// ==================== 公开接口 ====================

// 用户登录
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
        unit: user.unit,
        status: user.status
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 公开注册（使用邀请码）
router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName, phone, inviteCode } = req.body;

    if (!username || !password || !displayName || !inviteCode) {
      return res.status(400).json({ error: '缺少必要字段：username, password, displayName, inviteCode' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    const invite = db.prepare('SELECT * FROM invite_codes WHERE code = ? AND is_active = 1').get(inviteCode);
    if (!invite) {
      return res.status(400).json({ error: '邀请码无效或已过期' });
    }
    if (invite.used_by) {
      return res.status(400).json({ error: '该邀请码已被使用' });
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: '邀请码已过期' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: '用户名已存在' });

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    db.prepare('INSERT INTO users (id, username, password_hash, display_name, role, phone, invite_code, status) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, username, passwordHash, displayName, 'reporter', phone || null, inviteCode, 'pending');

    db.prepare('UPDATE invite_codes SET used_by = ?, used_at = datetime(\'now\',\'localtime\'), is_active = 0 WHERE id = ?')
      .run(id, invite.id);

    res.json({
      success: true,
      message: '注册成功！请等待管理员审核后即可登录使用。'
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

// 检查用户名是否可用
router.get('/check-username', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: '缺少用户名参数' });
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  res.json({ available: !existing });
});

// ==================== 管理员接口 ====================

// 生成邀请码
router.post('/invite-codes', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { count = 1, expiresInDays } = req.body;
    const codes = [];

    for (let i = 0; i < Math.min(count, 100); i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();

      let expiresAt = null;
      if (expiresInDays) {
        const d = new Date();
        d.setDate(d.getDate() + expiresInDays);
        expiresAt = d.toISOString().slice(0, 19).replace('T', ' ');
      }

      const id = uuidv4();
      db.prepare('INSERT INTO invite_codes (id, code, created_by, expires_at) VALUES (?, ?, ?, ?)')
        .run(id, code, req.user.id, expiresAt);

      codes.push({ id, code, expiresAt });
    }

    res.json({
      success: true,
      codes,
      message: `成功生成 ${codes.length} 个邀请码`
    });
  } catch (err) {
    console.error('生成邀请码失败:', err);
    res.status(500).json({ error: '生成邀请码失败' });
  }
});

// 获取邀请码列表
router.get('/invite-codes', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const codes = db.prepare(`
      SELECT ic.id, ic.code, ic.is_active, ic.created_at, ic.expires_at,
             ic.used_by, ic.used_at, u.display_name as used_by_name
      FROM invite_codes ic
      LEFT JOIN users u ON ic.used_by = u.id
      ORDER BY ic.created_at DESC
    `).all();
    res.json(codes);
  } catch (err) {
    console.error('获取邀请码列表失败:', err);
    res.status(500).json({ error: '获取列表失败' });
  }
});

// 停用邀请码
router.delete('/invite-codes/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    db.prepare('UPDATE invite_codes SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('停用邀请码失败:', err);
    res.status(500).json({ error: '操作失败' });
  }
});

// 获取待审核用户列表
router.get('/pending-users', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, display_name as displayName, role, phone, unit,
             invite_code, status, created_at
      FROM users WHERE status = 'pending'
      ORDER BY created_at ASC
    `).all();
    res.json(users);
  } catch (err) {
    console.error('获取待审核用户失败:', err);
    res.status(500).json({ error: '获取失败' });
  }
});

// 审核用户（通过/拒绝）
router.put('/pending-users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action 必须为 approve 或 reject' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND status = ?').get(req.params.id, 'pending');
    if (!user) return res.status(404).json({ error: '用户不存在或无需审核' });

    if (action === 'approve') {
      db.prepare("UPDATE users SET status = 'active', updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
    } else {
      if (user.invite_code) {
        db.prepare('UPDATE invite_codes SET used_by = NULL, used_at = NULL, is_active = 1 WHERE code = ?').run(user.invite_code);
      }
      db.prepare("UPDATE users SET status = 'disabled', updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
    }

    res.json({ success: true, action, message: action === 'approve' ? '用户已通过审核' : '用户已被拒绝' });
  } catch (err) {
    console.error('审核用户失败:', err);
    res.status(500).json({ error: '审核操作失败' });
  }
});

// ==================== 内部接口（管理员预建账号）====================

// 管理员创建用户（不校验邀请码，状态直接 active）
router.post('/admin-create', authMiddleware, requireRole('admin'), async (req, res) => {
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

    res.json({
      success: true,
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
    console.error('创建用户失败:', err);
    res.status(500).json({ error: '创建用户失败' });
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
