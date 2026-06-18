
const EventModel = require('../models/Event');
const { generateReport } = require('./reportGenerator');
const { broadcast } = require('../websocket');

// 存储每个事件的去抖定时器
const debounceTimers = new Map();

// 去抖间隔：30秒（等待批量素材一次提交完再生成）
const DEBOUNCE_MS = 30000;

/**
 * 素材上报后触发快报生成（带30秒去抖）
 * 同一事件多次触发会重置定时器
 */
function triggerGenerate(eventId) {
  if (debounceTimers.has(eventId)) {
    clearTimeout(debounceTimers.get(eventId));
  }

  // 检查事件是否仍活跃
  const event = EventModel.getById(eventId);
  if (!event || event.status !== 'active') {
    return;
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(eventId);
    try {
      const report = generateReport(eventId);
      console.log(`📡 新素材触发快报生成 - 事件 ${eventId} v${report.version}`);

      broadcast({
        type: 'cycle_report',
        eventId,
        reportId: report.id,
        version: report.version,
        summary: report.summary,
        diffNotes: report.diff_notes,
        generatedAt: report.created_at
      });
    } catch (err) {
      console.error(`❌ 快报生成失败(事件 ${eventId}):`, err.message);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(eventId, timer);
  console.log(`📝 新素材上报，30秒后生成快报 - 事件 ${eventId}`);
}

/**
 * 停止事件的去抖定时器
 */
function cancelPendingGenerate(eventId) {
  if (debounceTimers.has(eventId)) {
    clearTimeout(debounceTimers.get(eventId));
    debounceTimers.delete(eventId);
    console.log(`已取消事件 ${eventId} 的待生成快报`);
  }
}

/**
 * 取消所有待生成
 */
function cancelAllPending() {
  for (const [eventId, timer] of debounceTimers) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  console.log('已取消所有待生成快报');
}

/**
 * initCycles：原来用于启动轮询，现在仅做初始化日志
 * 迁移到素材触发模式后不再需要轮询
 */
function initCycles() {
  const events = EventModel.getActiveEvents();
  console.log(`📋 已切换到素材触发模式（${events.length} 个活跃事件），新素材上报后30秒自动生成快报`);
  console.log('⏱ 已移除定时轮询模式');
}

module.exports = {
  triggerGenerate,
  cancelPendingGenerate,
  cancelAllPending,
  initCycles
};
