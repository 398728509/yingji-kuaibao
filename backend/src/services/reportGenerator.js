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

  // 1. 提取文本内容
  const textMaterials = materials.filter(m => m.type === 'text').map(m => ({
    text: m.content, user: m.user_name, time: m.created_at, id: m.id
  }));

  // 2. 提取语音转文字内容
  const voiceMaterials = materials.filter(m => m.type === 'voice' && m.voice_text).map(m => ({
    text: m.voice_text, user: m.user_name, time: m.created_at, id: m.id
  }));

  // 3. 提取照片 OCR 内容
  const photoMaterials = materials.filter(m => m.type === 'photo' && m.ocr_text).map(m => ({
    text: m.ocr_text, user: m.user_name, time: m.created_at, id: m.id
  }));

  // 4. 提取照片文字描述
  const photoDescMaterials = materials.filter(m => m.type === 'photo').map(m => ({
    text: m.content || '(照片)',
    user: m.user_name,
    time: m.created_at,
    id: m.id
  }));

  // 5. 综合所有文本信息
  const allEntries = [
    ...textMaterials,
    ...voiceMaterials,
    ...photoDescMaterials,
    ...photoMaterials
  ].sort((a, b) => new Date(a.time) - new Date(b.time));

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

  // 9. 变化标注
  let diffNotes = '';
  if (lastReport) {
    const newMaterialsSince = materials.filter(
      m => new Date(m.created_at) > new Date(lastReport.created_at)
    );
    const newCount = newMaterialsSince.length;
    diffNotes = `本周期新增 ${newCount} 条素材`;
    if (conflicts.length > 0) {
      diffNotes += ` | ⚠️ ${conflicts.length} 处信息矛盾待核实`;
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
