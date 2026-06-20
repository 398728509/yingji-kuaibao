const MaterialModel = require('../models/Material');
const ReportModel = require('../models/Report');
const EventModel = require('../models/Event');
const TemplateModel = require('../models/Template');
const { classifyMaterial, detectConflicts } = require('./huaweiAI');
const { broadcast } = require('../websocket');

/**
 * AI 快报生成引擎
 * 从素材中提取信息，按模板填充，生成结构化快报
 */
function generateReport(eventId) {
  const event = EventModel.getById(eventId);
  if (!event) throw new Error('事件不存在');

  const materials = MaterialModel.listByEvent(eventId);
  const lastReport = ReportModel.getLatestByEvent(eventId);
  const version = ReportModel.getNextVersion(eventId);
  const template = TemplateModel.getActive() || JSON.parse(TemplateModel.getDefault()?.config || '{}');

  // 1. 一次遍历提取所有文本信息
  const allEntries = [];
  for (const m of materials) {
    let text = null;
    if (m.type === 'text') text = m.content;
    else if (m.type === 'voice') text = m.voice_text;
    else if (m.type === 'photo') text = m.ocr_text || m.content || '(照片)';
    if (text) {
      allEntries.push({
        text, user: m.user_name, time: m.created_at, id: m.id
      });
    }
  }
  allEntries.sort((a, b) => new Date(a.time) - new Date(b.time));

  // 6. 按板块分类
  const sections = {
    event_overview: {
      title: '事件概况',
      items: [],
      sourceIds: []
    },
    casualties: {
      title: '伤亡情况',
      items: [],
      sourceIds: []
    },
    response_progress: {
      title: '处置进展',
      items: [],
      sourceIds: []
    },
    coordination: {
      title: '需协调事项',
      items: [],
      sourceIds: []
    },
    site_conditions: {
      title: '现场情况',
      items: [],
      sourceIds: []
    }
  };

  for (const entry of allEntries) {
    const text = entry.text || '';
    if (!text) continue;

    // 使用 AI 分类引擎
    const target = classifyMaterial(text);

    sections[target].items.push(text);
    sections[target].sourceIds.push(entry.id);
  }

  // 检测矛盾信息
  const conflicts = detectConflicts(materials);
  if (conflicts.length > 0) {
    console.log('⚠️ 检测到信息矛盾:', conflicts.length, '处');
  }

  // 7. 构建快报内容
  const contentSections = [];
  for (const [key, sec] of Object.entries(sections)) {
    if (sec.items.length === 0) continue;
    contentSections.push({
      key,
      title: sec.title,
      items: [...new Set(sec.items)], // 去重
      sources: [...new Set(sec.sourceIds)]
    });
  }

  const content = JSON.stringify(contentSections);

  // 8. 生成摘要
  const allItems = contentSections.flatMap(s => s.items);
  const summary = allItems.slice(0, 3).join('；') + (allItems.length > 3 ? '……' : '');

  // 9. 变化标注 + 逐板块差异对比
  let diffNotes = '';
  let diffDetail = null;
  if (lastReport) {
    const newMaterialsSince = materials.filter(
      m => new Date(m.created_at) > new Date(lastReport.created_at)
    );
    const newCount = newMaterialsSince.length;
    diffNotes = `本周期新增 ${newCount} 条素材`;
    if (conflicts.length > 0) {
      diffNotes += ` | ⚠️ ${conflicts.length} 处信息矛盾待核实`;
    }

    // 逐板块 diff：对比当前版与上版的每个板块条目
    try {
      const prevContent = JSON.parse(lastReport.content || '[]');
      const prevMap = {};
      for (const sec of prevContent) prevMap[sec.key] = new Set(sec.items || []);

      diffDetail = JSON.stringify(contentSections.map(sec => {
        const prevItems = prevMap[sec.key] || new Set();
        const added = [];
        const removed = [];
        const kept = [];

        for (const item of (sec.items || [])) {
          if (prevItems.has(item)) kept.push(item);
          else added.push(item);
        }
        for (const item of prevItems) {
          if (!(sec.items || []).includes(item)) removed.push(item);
        }

        return {
          key: sec.key,
          title: sec.title,
          added,
          removed,
          kept
        };
      }));
    } catch (e) {
      console.warn('diff 生成失败:', e.message);
    }
  } else {
    diffNotes = '首版快报生成';
  }

  // 10. 创建快报
  const report = ReportModel.create({
    eventId,
    version,
    content: JSON.stringify(contentSections),
    summary: `【${event.title}】${summary}`,
    diffNotes,
    diffDetail,
    generatedBy: 'ai'
  });

  // 11. 关联素材
  const allMaterialIds = [...new Set(contentSections.flatMap(s => s.sources))];
  ReportModel.linkMaterials(report.id, allMaterialIds);

  // 12. 广播通知
  broadcast({
    type: 'report_generated',
    eventId,
    reportId: report.id,
    version,
    summary: report.summary,
    diffNotes
  });

  return report;
}

module.exports = { generateReport };
