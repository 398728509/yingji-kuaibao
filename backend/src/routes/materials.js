const express = require('express');
const router = express.Router();
const MaterialModel = require('../models/Material');

// 获取事件素材列表
router.get('/event/:eventId', (req, res) => {
  const { since } = req.query;
  let materials;
  if (since) {
    materials = MaterialModel.listByEventSince(req.params.eventId, since);
  } else {
    materials = MaterialModel.listByEvent(req.params.eventId);
  }
  res.json(materials);
});

// 获取单个素材
router.get('/:id', (req, res) => {
  const material = MaterialModel.getById(req.params.id);
  if (!material) return res.status(404).json({ error: '素材不存在' });
  res.json(material);
});

// 创建素材
router.post('/', (req, res) => {
  const { eventId, userId, type, content, filePath, fileSize, duration, thumbnailPath, tags } = req.body;
  if (!eventId || !userId || !type) {
    return res.status(400).json({ error: '缺少必要字段：eventId, userId, type' });
  }
  if (!['text', 'photo', 'voice', 'video'].includes(type)) {
    return res.status(400).json({ error: '类型必须为 text/photo/voice/video' });
  }
  const material = MaterialModel.create({
    eventId, userId, type, content, filePath, fileSize, duration, thumbnailPath, tags
  });
  res.json(material);
});

// 更新语音转文字
router.put('/:id/voice-text', (req, res) => {
  const { text } = req.body;
  const material = MaterialModel.updateVoiceText(req.params.id, text);
  res.json(material);
});

// 更新OCR文字
router.put('/:id/ocr-text', (req, res) => {
  const { text } = req.body;
  const material = MaterialModel.updateOcrText(req.params.id, text);
  res.json(material);
});

// 删除素材
router.delete('/:id', (req, res) => {
  MaterialModel.delete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
