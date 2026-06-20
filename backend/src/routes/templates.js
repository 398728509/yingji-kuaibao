const express = require('express');
const router = express.Router();
const TemplateModel = require('../models/Template');
const { requireRole } = require('../middleware/auth');

// 获取模板列表
router.get('/', (req, res) => {
  res.json(TemplateModel.list());
});

// 创建模板
router.post('/', requireRole('admin'), (req, res) => {
  const { name, config, createdBy } = req.body;
  if (!name || !config) return res.status(400).json({ error: '缺少必要字段' });
  const t = TemplateModel.create({ name, config, createdBy });
  res.json(t);
});

// 设为默认模板
router.post('/:id/default', requireRole('admin'), (req, res) => {
  TemplateModel.setDefault(req.params.id);
  res.json({ success: true });
});

// 获取默认模板
router.get('/default', (req, res) => {
  const t = TemplateModel.getDefault();
  res.json(t);
});

// 更新模板
router.put('/:id', requireRole('admin'), (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) return res.status(400).json({ error: '缺少必要字段' });
  const t = TemplateModel.update(req.params.id, { name, config });
  if (!t) return res.status(404).json({ error: '模板不存在' });
  res.json(t);
});

// 删除模板
router.delete('/:id', requireRole('admin'), (req, res) => {
  TemplateModel.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
