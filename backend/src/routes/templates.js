const express = require('express');
const router = express.Router();
const TemplateModel = require('../models/Template');

// 获取模板列表
router.get('/', (req, res) => {
  res.json(TemplateModel.list());
});

// 创建模板
router.post('/', (req, res) => {
  const { name, config, createdBy } = req.body;
  if (!name || !config) return res.status(400).json({ error: '缺少必要字段' });
  const t = TemplateModel.create({ name, config, createdBy });
  res.json(t);
});

// 设为默认模板
router.post('/:id/default', (req, res) => {
  TemplateModel.setDefault(req.params.id);
  res.json({ success: true });
});

// 获取默认模板
router.get('/default', (req, res) => {
  const t = TemplateModel.getDefault();
  res.json(t);
});

module.exports = router;
