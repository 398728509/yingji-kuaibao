const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

// 获取用户列表
router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = "SELECT id, username, display_name as displayName, role, phone, unit, status, created_at FROM users";
  const params = [];

  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at ASC";

  const users = db.prepare(sql).all(...params);
  res.json(users);
});

// 获取单个用户
router.get('/:id', (req, res) => {
  const user = db.prepare("SELECT id, username, display_name as displayName, role, phone, status FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

// 更新用户
router.put('/:id', (req, res) => {
  const { displayName, role, phone, unit, status } = req.body;
  const fields = [];
  const values = [];
  if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (unit !== undefined) { fields.push('unit = ?'); values.push(unit); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (fields.length === 0) return res.status(400).json({ error: '无更新字段' });
  fields.push("updated_at = datetime('now','localtime')");
  values.push(req.params.id);
  db.prepare('UPDATE users SET ' + fields.join(', ') + ' WHERE id = ?').run(...values);
  res.json({ success: true });
});

// 删除用户
router.delete('/:id', (req, res) => {
  db.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
