const express = require('express');
const router = express.Router();
const EventModel = require('../models/Event');
const { requireRole } = require('../middleware/auth');

// 获取事件列表
router.get('/', (req, res) => {
  const { status } = req.query;
  res.json(EventModel.list(status));
});

// 获取单个事件
router.get('/:id', (req, res) => {
  const event = EventModel.getById(req.params.id);
  if (!event) return res.status(404).json({ error: '事件不存在' });
  event.members = EventModel.getMembers(event.id);
  res.json(event);
});

// 创建事件（仅管理员）
router.post('/', requireRole('admin'), (req, res) => {
  const { title, description, location, longitude, latitude, createdBy } = req.body;
  if (!title || !location || !createdBy) {
    return res.status(400).json({ error: '缺少必要字段：title, location, createdBy' });
  }
  const event = EventModel.create({ title, description, location, longitude, latitude, createdBy });
  EventModel.addMember(event.id, createdBy, 'reporter');
  res.json(event);
});

// 更新事件
router.put('/:id', (req, res) => {
  const event = EventModel.update(req.params.id, req.body);
  if (!event) return res.status(404).json({ error: '事件不存在' });
  res.json(event);
});

// 关闭事件
router.post('/:id/close', (req, res) => {
  const event = EventModel.close(req.params.id);
  res.json(event);
});

// 归档事件
router.post('/:id/archive', (req, res) => {
  const event = EventModel.archive(req.params.id);
  res.json(event);
});

// 添加成员到事件
router.post('/:id/members', (req, res) => {
  const { userId, role } = req.body;
  EventModel.addMember(req.params.id, userId, role || 'reporter');
  res.json(EventModel.getMembers(req.params.id));
});

// 移除事件成员
router.delete('/:id/members/:userId', (req, res) => {
  EventModel.removeMember(req.params.id, req.params.userId);
  res.json({ success: true });
});

// 获取事件成员
router.get('/:id/members', (req, res) => {
  res.json(EventModel.getMembers(req.params.id));
});

module.exports = router;
