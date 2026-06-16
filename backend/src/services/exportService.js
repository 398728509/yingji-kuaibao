const ReportModel = require('../models/Report');
const EventModel = require('../models/Event');
const PizZip = require('pizzip');
const path = require('path');
const fs = require('fs');

/**
 * 将快报内容组装成 Word OpenXML
 */
function contentToWordXml(parsedContent, event, report) {
  const SECTION_TITLES = {
    event_overview: '事件概述',
    casualties: '伤亡情况',
    response_progress: '处置进展',
    coordination: '协调支援',
    site_conditions: '现场情况'
  };

  const SECTION_COLORS = {
    event_overview: '2B579A',
    casualties: 'C00000',
    response_progress: '548235',
    coordination: 'BF8F00',
    site_conditions: '7030A0'
  };

  let xml = '';

  // 标题
  xml += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="2B579A"/></w:rPr><w:t>应急快报</w:t></w:r></w:p>`;
  xml += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="404040"/></w:rPr><w:t>${event.title}</w:t></w:r></w:p>`;
  xml += `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:t>第 ${report.version} 版 · ${report.created_at?.substring(0, 10) || ''}</w:t></w:r></w:p>`;

  // 分割线
  xml += `<w:p><w:r><w:br/></w:r></w:p><w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>`;

  // 摘要
  if (report.summary) {
    xml += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>摘要</w:t></w:r></w:p>`;
    xml += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(report.summary)}</w:t></w:r></w:p>`;
    xml += `<w:p><w:r><w:br/></w:r></w:p>`;
  }

  // 各板块
  for (const sec of parsedContent) {
    if (!sec.items || sec.items.length === 0) continue;
    const secTitle = SECTION_TITLES[sec.key] || sec.title || sec.key;
    const color = SECTION_COLORS[sec.key] || '404040';

    xml += `<w:p><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="${color}"/></w:rPr><w:t>${escapeXml(secTitle)}</w:t></w:r></w:p>`;

    for (const item of sec.items) {
      xml += `<w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>• ${escapeXml(item)}</w:t></w:r></w:p>`;
    }
    xml += `<w:p><w:r><w:br/></w:r></w:p>`;
  }

  // 地点 & 状态信息
  xml += `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr></w:pPr></w:p>`;
  xml += `<w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:t>地点：${escapeXml(event.location || '未知')}</w:t></w:r></w:p>`;
  xml += `<w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:t>状态：${event.status === 'active' ? '进行中' : '已关闭'}</w:t></w:r></w:p>`;
  if (report.diff_notes) {
    xml += `<w:p><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:t>${escapeXml(report.diff_notes)}</w:t></w:r></w:p>`;
  }

  return xml;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 导出 Word 文档
 * 完全用 PizZip 从零构建 .docx，不依赖模板文件
 */
function exportWord(reportId) {
  const report = ReportModel.getById(reportId);
  if (!report) throw new Error('快报不存在');

  const event = EventModel.getById(report.event_id);
  if (!event) throw new Error('事件不存在');

  let parsedContent = [];
  try { parsedContent = JSON.parse(report.content); } catch { parsedContent = []; }

  // 构建完整的 document.xml
  const bodyXml = contentToWordXml(parsedContent, event, report);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>${bodyXml}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;

  const contentTypeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const _rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', contentTypeXml);
  zip.file('_rels/.rels', _rels);
  zip.file('word/_rels/document.xml.rels', wordRels);
  zip.file('word/document.xml', documentXml);

  return zip.generate({ type: 'nodebuffer' });
}

/**
 * 导出 HTML 版快报（可直接打印为 PDF）
 */
function exportHtml(reportId) {
  const report = ReportModel.getById(reportId);
  if (!report) throw new Error('快报不存在');
  const event = EventModel.getById(report.event_id);
  if (!event) throw new Error('事件不存在');

  let parsedContent = [];
  try { parsedContent = JSON.parse(report.content); } catch { parsedContent = []; }

  const SECTION_TITLES = {
    event_overview: '事件概述',
    casualties: '伤亡情况',
    response_progress: '处置进展',
    coordination: '协调支援',
    site_conditions: '现场情况'
  };
  const SECTION_COLORS = {
    event_overview: '#1890ff',
    casualties: '#ff4d4f',
    response_progress: '#52c41a',
    coordination: '#fa8c16',
    site_conditions: '#722ed1'
  };

  const secsHtml = parsedContent.filter(s => s.items?.length > 0).map(sec => {
    const title = SECTION_TITLES[sec.key] || sec.title || sec.key;
    const color = SECTION_COLORS[sec.key] || '#999';
    const items = sec.items.map(item => `<li>${item}</li>`).join('');
    return `
      <div class="section">
        <h2 style="color:${color};">${title}</h2>
        <ul>${items}</ul>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>应急快报 - ${event.title} - 第${report.version}版</title>
<style>
  @page { margin: 2.5cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; color: #333; line-height: 1.8; padding: 20px; }
  .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1890ff; }
  .header h1 { font-size: 24px; color: #1890ff; }
  .header .sub { font-size: 16px; color: #666; margin-top: 8px; }
  .header .meta { font-size: 13px; color: #999; margin-top: 4px; }
  .summary { background: #f0f5ff; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #1890ff; }
  .summary h2 { font-size: 16px; margin-bottom: 8px; color: #1890ff; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 16px; margin-bottom: 8px; padding-left: 12px; border-left: 4px solid; }
  .section ul { padding-left: 24px; }
  .section li { font-size: 14px; margin-bottom: 4px; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>🚨 应急快报</h1>
  <div class="sub">${event.title}</div>
  <div class="meta">第 ${report.version} 版 · ${report.created_at?.substring(0, 16) || ''} · 地点：${event.location || '未知'}</div>
</div>
<div class="status-bar" style="display:flex;gap:16px;margin-bottom:16px;font-size:13px;">
  <span>🏷 状态：<strong>${event.status === 'active' ? '🔴 进行中' : '🟢 已关闭'}</strong></span>
  <span>📋 版次：<strong>v${report.version}</strong></span>
  <span>📄 状态：<strong>${report.status === 'final' ? '✅ 已定稿' : '📝 待审阅'}</strong></span>
</div>
${report.diff_notes ? `<div style="background:#fffbe6;padding:10px 16px;border-radius:6px;margin-bottom:16px;font-size:13px;color:#ad8b00;">💡 ${report.diff_notes}</div>` : ''}
${report.summary ? `<div class="summary"><h2>摘要</h2><p>${report.summary}</p></div>` : ''}
${secsHtml}
<div class="footer">
  <p>生成时间：${new Date().toLocaleString('zh-CN')} · 应急快报系统自动生成</p>
  ${report.reviewed_at ? `<p>审阅定稿：${report.reviewed_at}</p>` : '<p>尚未定稿</p>'}
</div>
</body>
</html>`;
}

module.exports = { exportWord, exportHtml };
