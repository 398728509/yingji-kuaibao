const { Client, AppType, Domain, WSClient, EventDispatcher } = require('@larksuiteoapi/node-sdk');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const Tesseract = require('tesseract.js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { db } = require('../models/database');

// ===== 常量配置 =====
const REPORTER_USERNAME = 'ceshi1';
const MaterialModel = require('../models/Material');
const { broadcast } = require('../websocket');
const { triggerGenerate } = require('./reportScheduler');

// 图片存储目录
const IMAGE_DIR = path.join(__dirname, '..', '..', 'uploads', 'feishu-photos');
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

// ===== 事件分发器 =====
const eventDispatcher = new EventDispatcher({}).register({
  'im.message.receive_v1': async (data) => {
    const event = data.event || data;
    const message = event.message;
    const sender = event.sender;
  // 从 sender 提取 open_id（供后续传递）
  const feishuOpenId = (sender && sender.sender_id && sender.sender_id.open_id) || null;
    if (!message) return;

    const chatType = message.chat_type;
    const openChatId = message.chat_id;

    // === 文本消息处理 ===
    if (message.message_type === 'text') {
      let text = '';
      try {
        const parsed = JSON.parse(message.content);
        text = parsed.text || '';
      } catch { return; }

      // 群聊 @机器人 过滤
      if (chatType === 'group') {
        const mentionMatch = text.match(/<at\s+open_id="([^"]+)"[^>]*>/);
        if (!mentionMatch) return;
        text = text.replace(/<at[^>]+>[^<]*<\/at>\s*/g, '').trim();
      }
      if (!text) return;

      try {
        const reply = await handleMessage(text, openChatId, sender);
        if (reply && feishuClient) {
          await feishuClient.im.message.create({
            params: { receive_id_type: 'chat_id' },
            data: {
              receive_id: openChatId,
              msg_type: 'text',
              content: JSON.stringify({ text: reply })
            }
          });
        }
      } catch (err) {
        console.error('❌ 处理飞书消息失败:', err.message);
      }
    }

    // === 图片消息处理 ===
    if (message.message_type === 'image') {
      try {
        console.log('[📷 收到飞书图片]');
        const { image_key } = JSON.parse(message.content);
        if (!image_key) return;

        const messageId = message.message_id;
        const reply = await handleImageMessage(image_key, messageId, openChatId, feishuOpenId);
        if (reply && feishuClient) {
          await feishuClient.im.message.create({
            params: { receive_id_type: 'chat_id' },
            data: {
              receive_id: openChatId,
              msg_type: 'text',
              content: JSON.stringify({ text: reply })
            }
          });
        }
      } catch (err) {
        console.error('❌ 处理飞书图片失败:', err.message);
      }
    }

    // === 文件消息处理（视频/音频等） ===
    if (message.message_type === 'file') {
      try {
        console.log('[🎥 收到飞书文件]');
        const { file_key } = JSON.parse(message.content);
        if (!file_key) return;

        const messageId = message.message_id;
        const reply = await handleFileMessage(file_key, messageId, openChatId, feishuOpenId);
        if (reply && feishuClient) {
          await feishuClient.im.message.create({
            params: { receive_id_type: 'chat_id' },
            data: {
              receive_id: openChatId,
              msg_type: 'text',
              content: JSON.stringify({ text: reply })
            }
          });
        }
      } catch (err) {
        console.error('❌ 处理飞书文件失败:', err.message);
      }
    }

    // === 视频消息处理（飞书视频类型为 media） ===
    if (message.message_type === 'media') {
      try {
        console.log('[🎬 收到飞书视频]');
        const { file_key, image_key } = JSON.parse(message.content);
        // file_key 是视频文件 key，image_key 是封面图 key
        if (!file_key) {
          console.error('❌ 视频消息缺少 file_key');
          return;
        }

        const messageId = message.message_id;
        const reply = await handleFileMessage(file_key, messageId, openChatId, feishuOpenId);
        if (reply && feishuClient) {
          await feishuClient.im.message.create({
            params: { receive_id_type: 'chat_id' },
            data: {
              receive_id: openChatId,
              msg_type: 'text',
              content: JSON.stringify({ text: reply })
            }
          });
        }
      } catch (err) {
        console.error('❌ 处理飞书视频失败:', err.message);
      }
    }
  }
});

// ===== 飞书客户端 =====
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
if (!APP_ID || !APP_SECRET) {
  console.warn('⚠️ 未配置 FEISHU_APP_ID / FEISHU_APP_SECRET，飞书机器人未启动');
}

const feishuClient = (APP_ID && APP_SECRET) ? new Client({
  appId: APP_ID,
  appSecret: APP_SECRET,
  appType: AppType.Internal,
  domain: Domain.Feishu
}) : null;

// ===== 用户会话状态 =====
const userSessions = new Map();


// ===== 获取或创建会话（获取活跃事件） =====
function getOrCreateSession(chatId) {
  let session = userSessions.get(chatId);
  if (!session) {
    const active = db.prepare(
      "SELECT id, title FROM events WHERE status = 'active' ORDER BY created_at ASC LIMIT 1"
    ).get();
    const latest = active || db.prepare(
      "SELECT id, title FROM events ORDER BY created_at ASC LIMIT 1"
    ).get();
    if (!latest) return null;
    session = { eventId: latest.id, eventTitle: latest.title };
    userSessions.set(chatId, session);
  }
  return session;
}

// ===== 处理图片消息 =====
async function handleImageMessage(imageKey, messageId, chatId, openId) {
  const session = getOrCreateSession(chatId);
  if (!session) return '❌ 系统中暂无事件，请先在后台创建事件。';

  const reporter = getReporterByOpenId(openId);
  if (!reporter) return '❌ 无法获取上报人信息';

  try {
    // 使用 messageResource 接口下载用户发送的图片（需要 message_id + file_key）
    const { writeFile, headers } = await feishuClient.im.messageResource.get({
      path: {
        message_id: messageId,
        file_key: imageKey
      },
      params: {
        type: 'image'
      }
    });

    // 从响应头中确定格式
    const contentType = headers['content-type'] || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 
                contentType.includes('gif') ? 'gif' :
                contentType.includes('webp') ? 'webp' : 'jpg';

    const fileName = `feishu_${Date.now()}_${uuidv4().substring(0, 8)}.${ext}`;
    const filePath = path.join(IMAGE_DIR, fileName);

    // 使用 SDK 的 writeFile 直接保存到磁盘
    await writeFile(filePath);

    // 获取文件大小
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // 创建素材
    const material = MaterialModel.create({
      eventId: session.eventId,
      userId: reporter.id,
      type: 'photo',
      content: '',  // 图片没有文字描述
      filePath: `uploads/feishu-photos/${fileName}`,
      fileSize: fileSize,
      tags: '飞书上报表'
    });

    // 广播通知
    broadcast({
      type: 'material_created',
      eventId: session.eventId,
      materialId: material.id,
      userId: reporter.id,
      type: 'photo'
    });

    // 触发快报生成
    triggerGenerate(session.eventId);

    // === OCR 识别图片中的文字 ===
    try {
      const ocrText = await extractTextFromImage(filePath);
      if (ocrText && ocrText.length > 3) {
        // 有文字内容 - 额外写入一条文字素材
        const ocrMaterial = MaterialModel.create({
          eventId: session.eventId,
          userId: reporter.id,
          type: 'text',
          content: '📷 图片识别: ' + ocrText,
          tags: '飞书上报表（OCR）'
        });

        // 更新图片素材的 ocr_text
        db.prepare('UPDATE materials SET ocr_text = ? WHERE id = ?').run(ocrText, material.id);

        // 广播文字素材通知
        broadcast({
          type: 'material_created',
          eventId: session.eventId,
          materialId: ocrMaterial.id,
          userId: reporter.id,
          type: 'text'
        });

        console.log('📝 OCR写入文字素材成功:', ocrText.substring(0, 50));
      } else {
        // 更新图片素材的 ocr_text 为空（无文字图片）
        db.prepare('UPDATE materials SET ocr_text = ? WHERE id = ?').run('', material.id);
      }
    } catch (ocrErr) {
      console.error('❌ OCR处理异常:', ocrErr.message);
    }

    return '✅ 图片素材已提交\n' +
      '━━━━━━━━━━━━━━━━\n' +
      '🆔 事件: ' + session.eventTitle + '\n' +
      '👤 上报人: ' + reporter.display_name + '\n' +
      '📸 图片大小: ' + (fileSize / 1024).toFixed(1) + ' KB\n' +
      '━━━━━━━━━━━━━━━━\n' +
      '💡 发送文字消息将继续上报文字素材';

  } catch (err) {
    console.error('❌ 下载/提交图片失败:', err.message);
    return '❌ 图片素材提交失败: ' + err.message;
  }
}

// ===== 处理文件消息（视频/音频） =====
const FILE_DIR = path.join(__dirname, '..', '..', 'uploads', 'feishu-files');
if (!fs.existsSync(FILE_DIR)) fs.mkdirSync(FILE_DIR, { recursive: true });

async function handleFileMessage(fileKey, messageId, chatId, openId) {
  const session = getOrCreateSession(chatId);
  if (!session) return '❌ 系统中暂无事件，请先在后台创建事件。';

  const reporter = getReporterByOpenId(openId);
  if (!reporter) return '❌ 无法获取上报人信息';

  try {
    // 使用 messageResource 接口下载文件
    const { writeFile, headers } = await feishuClient.im.messageResource.get({
      path: {
        message_id: messageId,
        file_key: fileKey
      },
      params: {
        type: 'file'
      }
    });

    // 从文件名或响应头推断类型
    const contentType = headers['content-type'] || 'application/octet-stream';
    
    let ext = 'mp4';
    if (contentType.includes('mp4')) ext = 'mp4';
    else if (contentType.includes('mov')) ext = 'mov';
    else if (contentType.includes('avi')) ext = 'avi';
    else if (contentType.includes('mkv')) ext = 'mkv';
    else if (contentType.includes('mp3')) ext = 'mp3';
    else if (contentType.includes('wav')) ext = 'wav';
    else if (contentType.includes('amr')) ext = 'amr';
    else if (contentType.includes('m4a')) ext = 'm4a';

    const fileName = `feishu_${Date.now()}_${uuidv4().substring(0, 8)}.${ext}`;
    const filePath = path.join(FILE_DIR, fileName);

    await writeFile(filePath);

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // 判断是视频还是音频
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
    const isVideo = videoExts.includes(ext);
    const materialType = isVideo ? 'video' : 'voice';

    // 创建素材
    const material = MaterialModel.create({
      eventId: session.eventId,
      userId: reporter.id,
      type: materialType,
      content: '',
      filePath: `uploads/feishu-files/${fileName}`,
      fileSize: fileSize,
      tags: '飞书上报表'
    });

    // 广播通知
    broadcast({
      type: 'material_created',
      eventId: session.eventId,
      materialId: material.id,
      userId: reporter.id,
      type: materialType
    });

    // 触发快报生成
    triggerGenerate(session.eventId);

    const emoji = isVideo ? '🎬' : '🎤';
    const typeLabel = isVideo ? '视频' : '音频';

    return '✅ ' + typeLabel + '素材已提交\n' +
      '━━━━━━━━━━━━━━━━\n' +
      '🆔 事件: ' + session.eventTitle + '\n' +
      '👤 上报人: ' + reporter.display_name + '\n' +
      emoji + ' 文件大小: ' + (fileSize / 1024).toFixed(1) + ' KB\n' +
      '📁 格式: ' + ext.toUpperCase() + '\n' +
      '━━━━━━━━━━━━━━━━\n' +
      '💡 发送文字消息将继续上报文字素材';

  } catch (err) {
    console.error('❌ 下载/提交文件失败:', err.message);
    return '❌ ' + err.message;
  }
}

// ===== 以下文本消息处理代码不变 =====

// ===== 消息处理入口 =====

// ===== 根据飞书open_id获取上报人 =====
function getReporterByOpenId(openId) {
  if (openId) {
    const user = db.prepare("SELECT id, display_name FROM users WHERE feishu_open_id = ? AND status = 'active'").get(openId);
    if (user) return user;
  }
  // 未找到则使用默认账号
  return db.prepare("SELECT id, display_name FROM users WHERE username = ?").get(REPORTER_USERNAME);
}

// ===== 通过飞书open_id获取用户名（简化版，不依赖Contact API权限） =====
function getSimpleUserName(openId) {
  // 没有通讯录权限，生成一个可读的用户名
  return '飞书用户_' + (openId ? openId.substring(openId.length - 6) : 'unknown');
}




// ===== 图片OCR文字识别 =====
async function extractTextFromImage(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) return '';
    const { data } = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
      logger: m => {} // 静默模式
    });
    const text = (data.text || '').trim();
    console.log('📝 OCR识别结果:', text ? text.substring(0, 80) + (text.length > 80 ? '...' : '') : '(无文字)');
    return text;
  } catch (err) {
    console.error('❌ OCR识别失败:', err.message);
    return '';
  }
}

async function handleMessage(text, chatId, sender) {
  // 从 sender 中提取 open_id
  // sender 结构: { sender_id: { open_id, union_id, user_id }, sender_type, tenant_key }
  const openId = (sender && sender.sender_id && sender.sender_id.open_id) || 
                 (sender && sender.sender_id && sender.sender_id.user_id) ||
                 (sender && sender.open_id) ||
                 (sender && sender.user_id) ||
                 (sender && sender.id && sender.id.open_id) ||
                 (sender && sender.sender && sender.sender.user_id) || 
                 null;

  // === 自动同步飞书用户 ===
  if (openId) {
    const existingFeishuLink = db.prepare("SELECT id FROM users WHERE feishu_open_id = ?").get(openId);
    if (!existingFeishuLink) {
      try {
        // 生成用户名和显示名
        const feishuName = getSimpleUserName(openId);
        const { v4: uuidv4 } = require('uuid');
        // bcrypt required at top of file
        // bcrypt required at top of file
        const newId = uuidv4();
        const defaultPwd = await bcrypt.hash('123456', 10);
        const feishuUsername = 'feishu_' + openId.substring(0, 8);

        db.prepare(
          "INSERT INTO users (id, username, password_hash, display_name, role, status, feishu_open_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime('now','localtime'),datetime('now','localtime'))"
        ).run(newId, feishuUsername, defaultPwd, feishuName, 'reporter', 'active', openId);

        console.log('✅ 飞书用户自动注册:', feishuName, '(' + feishuUsername + ')');
      } catch (err) {
        console.error('❌ 自动注册飞书用户失败:', err.message);
      }
    }
  }

  const cmd = text.trim();

  if (/^(帮助|help|状态|菜单)$/i.test(cmd)) {
    return getHelpText();
  }
  if (/^(事件|events|活跃事件)$/i.test(cmd)) {
    return listActiveEvents();
  }
  if (/^全部事件$/i.test(cmd)) {
    return listAllEvents();
  }
  const selectMatch = cmd.match(/^选择事件\s+(.+)/i);
  if (selectMatch) {
    return selectEvent(selectMatch[1].trim(), chatId);
  }
  if (/^当前事件$/i.test(cmd)) {
    return getCurrentEvent(chatId);
  }
  const detailMatch = cmd.match(/^事件详情\s+(.+)/i);
  if (detailMatch) {
    return getEventDetail(detailMatch[1].trim());
  }
  if (/^(今日快报|今日简报)$/i.test(cmd)) {
    return getTodayReports();
  }
  if (/^(取消|清除|切换事件)$/i.test(cmd)) {
    userSessions.delete(chatId);
    return '✅ 已清除当前事件选择。发送"活跃事件"查看可选事件。';
  }

  if (/^设置名字\s+/.test(cmd)) {
    const newName = cmd.replace(/^设置名字\s+/, '').trim();
    if (!newName || newName.length > 20) return '❌ 姓名长度需在1-20个字符之间';
    try {
      const user = db.prepare("SELECT id, display_name, feishu_open_id FROM users WHERE feishu_open_id = ?").get(openId);
      if (!user) return '❌ 您尚未注册，请先发送任意消息自动注册。';
      db.prepare("UPDATE users SET display_name = ?, updated_at = datetime('now','localtime') WHERE feishu_open_id = ?").run(newName, openId);
      return '✅ 已修改显示名为：' + newName + '\n后续素材将以此名字上报。';
    } catch (err) {
      return '❌ 修改失败: ' + err.message;
    }
  }
  return submitAsMaterial(cmd, chatId, openId);
}

// ===== 以下所有函数保持原样 =====

function getHelpText() {
  return '🔌 应急快报机器人 — 信息采集\n' +
    '━━━━━━━━━━━━━━━━\n' +
    '【上报消息】\n' +
    '直接发送文字内容 → 自动提交素材到当前事件\n' +
    '发送图片、视频/文件 → 自动以您的身份上报素材\n' +
    '\n' +
    '【事件选择】\n' +
    '📋 "事件" / "活跃事件" — 查看可选事件列表\n' +
    '🎯 "选择事件 [关键词]" — 选择要上报的事件\n' +
    'ℹ️ "当前事件" — 查看已选中的事件\n' +
    '🔄 "取消" / "清除" — 切换事件\n' +
    '\n' +
    '【查询指令】\n' +
    '📋 "事件详情 [ID]" — 查看事件详情\n' +
    '📰 "今日快报" — 今日已定稿快报\n' +
    '\n' +
    '💡 提示：选择事件后，后续消息将以您的身份上报素材';
}

function listActiveEvents() {
  const events = db.prepare(
    "SELECT id, title, status, created_at FROM events ORDER BY created_at ASC LIMIT 10"
  ).all();
  if (events.length === 0) return '📭 暂无事件';
  const lines = events.map((e, i) =>
    `${i + 1}. [${e.status === 'active' ? '🟢' : '🔴'}] ${e.title}\n` +
    `   ID: ${e.id}\n` +
    `   创建: ${e.created_at?.substring(0, 16) || '-'}`
  );
  return '📋 事件列表（共' + events.length + '个）:\n\n' +
    lines.join('\n\n') +
    '\n\n发送"选择事件 [关键词]" 选择要上报的事件';
}

function listAllEvents() {
  return listActiveEvents();
}

function selectEvent(keyword, chatId) {
  const exactId = db.prepare("SELECT id, title, status FROM events WHERE id = ?").get(keyword);
  if (exactId) {
    userSessions.set(chatId, { eventId: exactId.id, eventTitle: exactId.title });
    return '✅ 已选择事件：' + exactId.title + '\n现在发送消息将自动以您的身份上报素材到此事件。';
  }
  const matches = db.prepare(
    "SELECT id, title FROM events WHERE title LIKE ? ORDER BY created_at DESC LIMIT 5"
  ).all('%' + keyword + '%');
  if (matches.length === 0) {
    return '❌ 未找到匹配的事件，请发送"事件"查看列表。';
  }
  if (matches.length === 1) {
    userSessions.set(chatId, { eventId: matches[0].id, eventTitle: matches[0].title });
    return '✅ 已选择事件：' + matches[0].title + '\n现在发送消息将自动以您的身份上报素材到此事件。';
  }
  const lines = matches.map((e, i) => `${i + 1}. ${e.title}（${e.id.substring(0, 8)}…）`);
  return '🔍 找到多个匹配事件：\n\n' + lines.join('\n') + '\n\n请发送"选择事件 [ID]" 精确选择。';
}

function getCurrentEvent(chatId) {
  const session = userSessions.get(chatId);
  if (!session) {
    const active = db.prepare(
      "SELECT id, title FROM events WHERE status = 'active' ORDER BY created_at ASC LIMIT 1"
    ).get();
    if (active) {
      return '⏳ 尚未选择事件。\n当前有活跃事件：' + active.title + '\n发送"选择事件 ' + active.id.substring(0, 8) + '" 选择它，或发送"事件"查看全部。';
    }
    return '⏳ 尚未选择事件。发送"事件"查看可选列表。';
  }
  return '🎯 当前已选择：' + session.eventTitle + '\n(ID: ' + session.eventId + ')\n发送消息将上报到此事件。';
}

function getEventDetail(keyword) {
  const ev = db.prepare("SELECT * FROM events WHERE id = ?").get(keyword) ||
            db.prepare("SELECT * FROM events WHERE title LIKE ? ORDER BY created_at ASC LIMIT 1").get(['%' + keyword + '%']);
  if (!ev) return '❌ 未找到该事件';
  const reportCount = db.prepare("SELECT COUNT(*) as c FROM reports WHERE event_id = ?").get(ev.id).c;
  const materialCount = db.prepare("SELECT COUNT(*) as c FROM materials WHERE event_id = ?").get(ev.id).c;
  return '📋 事件详情\n' +
    '标题: ' + ev.title + '\n' +
    '状态: ' + (ev.status === 'active' ? '🟢 进行中' : '🔴 已关闭') + '\n' +
    '地点: ' + (ev.location || '-') + '\n' +
    '创建: ' + (ev.created_at || '-') + '\n' +
    '快报: ' + reportCount + '期 | 素材: ' + materialCount + '条';
}

function getTodayReports() {
  const today = new Date().toISOString().substring(0, 10);
  const reports = db.prepare(
    "SELECT r.*, e.title as event_title FROM reports r " +
    "JOIN events e ON r.event_id = e.id " +
    "WHERE r.created_at LIKE ? AND r.status = 'final' " +
    "ORDER BY r.created_at DESC LIMIT 5",
    [today + '%']
  ).all();
  if (reports.length === 0) return '📭 今日暂无定稿快报';
  const lines = reports.map(r =>
    '[' + r.event_title + '] 第' + r.version + '期 → ' + (r.created_at?.substring(11, 16) || '')
  );
  return '📰 今日快报（' + reports.length + '期）:\n' + lines.join('\n');
}

async function submitAsMaterial(text, chatId, openId) {
  const session = getOrCreateSession(chatId);
  if (!session) return '❌ 系统中暂无事件，请先在后台创建事件。';

  const reporter = getReporterByOpenId(openId);
  if (!reporter) return '❌ 无法获取上报人信息';

  try {
    const material = MaterialModel.create({
      eventId: session.eventId,
      userId: reporter.id,
      type: 'text',
      content: text,
      tags: '飞书上报表'
    });

    broadcast({
      type: 'material_created',
      eventId: session.eventId,
      materialId: material.id,
      userId: reporter.id,
      type: 'text'
    });

    triggerGenerate(session.eventId);

    return '✅ 素材已提交\n' +
      '━━━━━━━━━━━━━━━━\n' +
      '🆔 事件: ' + session.eventTitle + '\n' +
      '👤 上报人: ' + reporter.display_name + ' (' + REPORTER_USERNAME + ')\n' +
      '📝 内容: ' + truncateText(text, 60) + '\n' +
      '━━━━━━━━━━━━━━━━\n' +
      '💡 继续发送消息将继续上报到此事件\n' +
      '发送"切换事件"可更换上报事件';

  } catch (err) {
    console.error('❌ 提交素材失败:', err);
    return '❌ 素材提交失败: ' + err.message;
  }
}

function truncateText(str, maxLen) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.substring(0, maxLen) + '…';
}

// ===== WSClient 管理 =====
let wsClient = null;

function startFeishuBot() {
  if (!APP_ID || !APP_SECRET) return;
  if (wsClient) return;

  wsClient = new WSClient({
    appId: APP_ID,
    appSecret: APP_SECRET
  });

  wsClient.start({ eventDispatcher });
  const sdkPkg = require('@larksuiteoapi/node-sdk/package.json');
  console.log('📦 SDK版本:', sdkPkg.version, '| 应用ID:', APP_ID?.substring(0, 15)+'...');
  console.log('🤖 飞书机器人已启动（长连接）');
}

function stopFeishuBot() {
  if (wsClient) {
    try { wsClient.stop(); } catch {}
    wsClient = null;
    console.log('🤖 飞书机器人已停止');
  }
}

module.exports = { feishuClient, startFeishuBot, stopFeishuBot };
