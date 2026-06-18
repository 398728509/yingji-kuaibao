const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 获取用户列表
router.get('/', (req, res) => {
  const users = db.prepare("SELECT id, username, display_name as displayName, role, phone, unit, status, created_at FROM users WHERE status IS NULL OR status != 'disabled' ORDER BY created_at ASC").all();
  res.json(users);
});

// 获取单个用户
router.get('/:id', (req, res) => {
  const user = db.prepare("SELECT id, username, display_name as displayName, role, phone, unit, status FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// 更新用户
router.put('/:id', (req, res) => {
  const ALLOWED_FIELDS = new Map([
    ['displayName', 'display_name'],
    ['role', 'role'],
    ['phone', 'phone'],
    ['status', 'status']
  ]);

  const fields = [];
  const values = [];
  for (const [key, col] of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) {
      fields.push(col + ' = ?');
      values.push(req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: '无更新字段' });
  fields.push("updated_at = datetime('now','localtime')");
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// 删除用户
router.delete('/:id', (req, res) => {
  // 如果用户有上报的记录，软删除；否则硬删除
  const matCount = db.prepare("SELECT COUNT(*) as c FROM materials WHERE user_id = ?").get(req.params.id).c;
  if (matCount > 0) {
    db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(req.params.id);
  } else {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

module.exports = router;
