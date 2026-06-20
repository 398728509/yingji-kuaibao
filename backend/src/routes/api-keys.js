const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { db } = require('../models/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Ensure table exists
db.exec(
  "CREATE TABLE IF NOT EXISTS api_keys (" +
  "  id TEXT PRIMARY KEY," +
  "  name TEXT NOT NULL," +
  "  api_key TEXT NOT NULL UNIQUE," +
  "  prefix TEXT NOT NULL," +
  "  created_by TEXT," +
  "  created_at TEXT DEFAULT (datetime('now','localtime'))," +
  "  last_used_at TEXT," +
  "  status TEXT DEFAULT 'active' CHECK(status IN ('active','revoked'))," +
  "  permission TEXT DEFAULT 'read' CHECK(permission IN ('read','write','admin'))" +
  ")"
);

// List all API keys (prefix only, never full key)
router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const keys = db.prepare(
      "SELECT ak.id, ak.name, ak.prefix, ak.created_at, ak.last_used_at, ak.status, ak.permission," +
      "  u.display_name as created_by_name" +
      " FROM api_keys ak" +
      " LEFT JOIN users u ON ak.created_by = u.id" +
      " ORDER BY ak.created_at DESC"
    ).all();
    res.json(keys);
  } catch (err) {
    console.error('get api keys error:', err);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// Generate new API key
router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { name, permission = 'read' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please provide a key name' });
    }
    const id = uuidv4();
    const rawKey = 'yk_' + crypto.randomBytes(24).toString('hex');
    const prefix = rawKey.substring(0, 14) + '...';
    db.prepare(
      "INSERT INTO api_keys (id, name, api_key, prefix, created_by, permission) VALUES (?,?,?,?,?,?)"
    ).run(id, name.trim(), rawKey, prefix, req.user.id, permission);
    res.json({
      success: true,
      id, name: name.trim(), apiKey: rawKey, prefix, permission,
      message: 'API key created. Save it now - it will not be shown again.'
    });
  } catch (err) {
    console.error('create api key error:', err);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Revoke API key
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    db.prepare("UPDATE api_keys SET status = ? WHERE id = ?").run('revoked', req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('revoke api key error:', err);
    res.status(500).json({ error: 'Failed to revoke' });
  }
});

// Verify API key
router.post('/verify', authMiddleware, (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });
    const record = db.prepare(
      "SELECT id, name, permission FROM api_keys WHERE api_key = ? AND status = ?"
    ).get(apiKey, 'active');
    if (!record) return res.status(403).json({ error: 'Invalid or revoked key' });
    db.prepare(
      "UPDATE api_keys SET last_used_at = datetime('now','localtime') WHERE id = ?"
    ).run(record.id);
    res.json({ valid: true, id: record.id, name: record.name, permission: record.permission });
  } catch (err) {
    console.error('verify api key error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// List all available API endpoints
router.get('/endpoints', authMiddleware, requireRole('admin'), (req, res) => {
  const eps = [
    { method: 'GET',    path: '/api/auth/me',               desc: 'Current user info', auth: 'JWT' },
    { method: 'POST',   path: '/api/auth/login',            desc: 'Login', auth: 'None' },
    { method: 'POST',   path: '/api/auth/register',         desc: 'Register (invite code)', auth: 'None' },
    { method: 'GET',    path: '/api/events',                desc: 'List events', auth: 'JWT' },
    { method: 'GET',    path: '/api/events/:id',            desc: 'Event detail', auth: 'JWT' },
    { method: 'POST',   path: '/api/events',                desc: 'Create event', auth: 'JWT' },
    { method: 'PUT',    path: '/api/events/:id',            desc: 'Update event', auth: 'JWT' },
    { method: 'POST',   path: '/api/events/:id/close',      desc: 'Close event', auth: 'JWT' },
    { method: 'GET',    path: '/api/materials/event/:id',   desc: 'List materials', auth: 'JWT' },
    { method: 'POST',   path: '/api/materials',             desc: 'Upload material', auth: 'JWT' },
    { method: 'DELETE', path: '/api/materials/:id',         desc: 'Delete material', auth: 'JWT' },
    { method: 'GET',    path: '/api/reports/event/:id',     desc: 'List reports', auth: 'JWT' },
    { method: 'POST',   path: '/api/reports/generate/:id',  desc: 'Generate report', auth: 'JWT' },
    { method: 'POST',   path: '/api/reports/:id/finalize',  desc: 'Finalize report', auth: 'JWT' },
    { method: 'GET',    path: '/api/reports/:id/export/word',desc: 'Export Word', auth: 'JWT' },
    { method: 'GET',    path: '/api/reports/:id/export/html',desc: 'Export HTML', auth: 'JWT' },
    { method: 'GET',    path: '/api/users',                 desc: 'List users', auth: 'JWT+Admin' },
    { method: 'PUT',    path: '/api/users/:id',             desc: 'Update user', auth: 'JWT+Admin' },
    { method: 'GET',    path: '/api/templates',             desc: 'List templates', auth: 'JWT' },
    { method: 'POST',   path: '/api/templates',             desc: 'Create template', auth: 'JWT+Admin' },
    { method: 'GET',    path: '/api/auth/invite-codes',     desc: 'List invite codes', auth: 'JWT+Admin' },
    { method: 'POST',   path: '/api/auth/invite-codes',     desc: 'Generate invite codes', auth: 'JWT+Admin' },
    { method: 'GET',    path: '/api/auth/pending-users',    desc: 'List pending users', auth: 'JWT+Admin' },
    { method: 'PUT',    path: '/api/auth/pending-users/:id',desc: 'Review pending user', auth: 'JWT+Admin' },
    { method: 'GET',    path: '/api/api-keys',              desc: 'List API keys', auth: 'JWT+Admin' },
    { method: 'POST',   path: '/api/api-keys',              desc: 'Create API key', auth: 'JWT+Admin' },
    { method: 'DELETE', path: '/api/api-keys/:id',          desc: 'Revoke API key', auth: 'JWT+Admin' },
    { method: 'POST',   path: '/api/upload',                desc: 'Upload file', auth: 'JWT' },
  ];
  res.json(eps);
});

module.exports = router;
