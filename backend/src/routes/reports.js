const express = require('express');
const router = express.Router();
const ReportModel = require('../models/Report');
const { generateReport } = require('../services/reportGenerator');

// 获取事件快报列表
router.get('/event/:eventId', (req, res) => {
  res.json(ReportModel.listByEvent(req.params.eventId));
});

// 获取事件最新快报
router.get('/event/:eventId/latest', (req, res) => {
  const { final } = req.query;
  const report = final === 'true'
    ? ReportModel.getLatestFinalByEvent(req.params.eventId)
    : ReportModel.getLatestByEvent(req.params.eventId);
  if (!report) return res.json(null);
  report.materials = ReportModel.getLinkedMaterials(report.id);
  res.json(report);
});

// 获取单个快报
router.get('/:id', (req, res) => {
  const report = ReportModel.getById(req.params.id);
  if (!report) return res.status(404).json({ error: '快报不存在' });
  report.materials = ReportModel.getLinkedMaterials(report.id);
  res.json(report);
});

// AI 生成快报
router.post('/generate/:eventId', (req, res) => {
  const { eventId } = req.params;
  const report = generateReport(eventId);
  res.json(report);
});

// 定稿
router.post('/:id/finalize', (req, res) => {
  const { reviewerId } = req.body;
  const report = ReportModel.finalize(req.params.id, reviewerId);
  res.json(report);
});

module.exports = router;
