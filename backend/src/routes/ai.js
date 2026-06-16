const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const MaterialModel = require('../models/Material');
const { voiceToText, imageOcr, classifyMaterial, detectConflicts } = require('../services/huaweiAI');
const { broadcast } = require('../websocket');

/**
 * 对单个素材进行语音转文字
 * POST /api/ai/voice-to-text/:materialId
 */
router.post('/voice-to-text/:materialId', async (req, res) => {
  try {
    const material = MaterialModel.getById(req.params.materialId);
    if (!material) return res.status(404).json({ error: '素材不存在' });
    if (material.type !== 'voice') return res.status(400).json({ error: '素材不是语音类型' });

    const filePath = path.join(__dirname, '..', '..', material.file_path);
    const text = await voiceToText(filePath);

    if (text) {
      MaterialModel.updateVoiceText(material.id, text);
      broadcast({
        type: 'voice_transcribed',
        materialId: material.id,
        eventId: material.event_id,
        text
      });
    }

    res.json({ materialId: material.id, text });
  } catch (err) {
    console.error('语音转文字失败:', err);
    res.status(500).json({ error: '处理失败' });
  }
});

/**
 * 对单个素材进行图片 OCR
 * POST /api/ai/ocr/:materialId
 */
router.post('/ocr/:materialId', async (req, res) => {
  try {
    const material = MaterialModel.getById(req.params.materialId);
    if (!material) return res.status(404).json({ error: '素材不存在' });
    if (material.type !== 'photo') return res.status(400).json({ error: '素材不是图片类型' });

    const filePath = path.join(__dirname, '..', '..', material.file_path);
    const text = await imageOcr(filePath);

    if (text) {
      MaterialModel.updateOcrText(material.id, text);
    }

    res.json({ materialId: material.id, text });
  } catch (err) {
    console.error('图片OCR失败:', err);
    res.status(500).json({ error: '处理失败' });
  }
});

/**
 * 批量处理事件下所有待处理的素材
 * POST /api/ai/batch-process/:eventId
 */
router.post('/batch-process/:eventId', async (req, res) => {
  try {
    const materials = MaterialModel.listByEvent(req.params.eventId);
    const results = { transcribed: 0, ocr: 0, errors: [] };

    for (const material of materials) {
      try {
        if (material.type === 'voice' && !material.voice_text) {
          const filePath = path.join(__dirname, '..', '..', material.file_path);
          if (fs.existsSync(filePath)) {
            const text = await voiceToText(filePath);
            if (text) {
              MaterialModel.updateVoiceText(material.id, text);
              results.transcribed++;
            }
          }
        } else if (material.type === 'photo' && !material.ocr_text) {
          const filePath = path.join(__dirname, '..', '..', material.file_path);
          if (fs.existsSync(filePath)) {
            const text = await imageOcr(filePath);
            if (text) {
              MaterialModel.updateOcrText(material.id, text);
              results.ocr++;
            }
          }
        }
      } catch (err) {
        results.errors.push({ materialId: material.id, error: err.message });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('批量处理失败:', err);
    res.status(500).json({ error: '批量处理失败' });
  }
});

/**
 * 检测素材矛盾
 * POST /api/ai/detect-conflicts/:eventId
 */
router.post('/detect-conflicts/:eventId', (req, res) => {
  const materials = MaterialModel.listByEvent(req.params.eventId);
  const conflicts = detectConflicts(materials);
  res.json({ eventId: req.params.eventId, conflicts });
});

/**
 * 素材分类
 * POST /api/ai/classify
 */
router.post('/classify', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '缺少 text 参数' });
  const category = classifyMaterial(text);
  res.json({ text: text.substring(0, 50), category });
});

module.exports = router;
