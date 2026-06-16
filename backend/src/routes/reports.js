const express = require('express');
const router = express.Router();
const ReportModel = require('../models/Report');
const { generateReport } = require('../services/reportGenerator');
const { exportWord, exportHtml } = require('../services/exportService');

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

// 导出 Word（必须在 /:id 之前注册，避免被捕获为 id）
router.get('/:id/export/word', (req, res) => {
  try {
    const buf = exportWord(req.params.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="report_v1.docx"`);
    res.send(buf);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 导出 PDF
router.get('/:id/export/pdf', (req, res) => {
  try {
    const html = exportHtml(req.params.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="report_v1.html"`);
    res.send(html);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 获取单个快报（放在导出路由之后，避免捕获导出路径）
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

// 导出 HTML（预览/打印）
router.get('/:id/export/html', (req, res) => {
  try {
    const html = exportHtml(req.params.id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// 导出 PDF（通过 HTML 打印）
module.exports = router;
