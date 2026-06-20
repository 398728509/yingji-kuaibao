/**
 * 华为云 AI 服务集成
 * 提供：语音转文字 (ASR)、图片 OCR、通用文本处理
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 华为云 AI 配置
const HUAWEI_AI_CONFIG = {
  appCode: process.env.HUAWEI_AI_APPCODE || '',
  // 语音识别
  asrUrl: 'https://api.huaweicloud.com/v1/voice/asr',
  // OCR
  ocrUrl: 'https://api.huaweicloud.com/v1/ocr/general',
};

/**
 * 带 AppCode 认证的华为云 API 请求
 */
function huaweiRequest(url, payload) {
  return new Promise((resolve, reject) => {
    if (!HUAWEI_AI_CONFIG.appCode) {
      return reject(new Error('HUAWEI_AI_APPCODE 未配置'));
    }

    const urlObj = new URL(url);
    const data = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-APIG-AppCode': HUAWEI_AI_CONFIG.appCode,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * 语音转文字
 * @param {string} audioPath - 语音文件本地路径
 * @param {number} sampleRate - 采样率，默认16000
 * @returns {Promise<string>} 转写结果文本
 */
async function voiceToText(audioPath, sampleRate = 16000) {
  try {
    if (!fs.existsSync(audioPath)) {
      throw new Error('语音文件不存在: ' + audioPath);
    }

    const audioData = fs.readFileSync(audioPath);
    const payload = {
      audio: audioData.toString('base64'),
      sampleRate: sampleRate,
      language: 'zh'
    };

    const result = await huaweiRequest(HUAWEI_AI_CONFIG.asrUrl, payload);
    return result.text || result.result?.text || '';
  } catch (err) {
    console.error('语音转文字失败:', err.message);
    return '';
  }
}

/**
 * 图片 OCR 识别
 * @param {string} imagePath - 图片文件本地路径
 * @returns {Promise<string>} OCR 提取的文字
 */
async function imageOcr(imagePath) {
  try {
    if (!fs.existsSync(imagePath)) {
      throw new Error('图片文件不存在: ' + imagePath);
    }

    const imgData = fs.readFileSync(imagePath);
    const payload = {
      image: imgData.toString('base64'),
      language: 'zh'
    };

    const result = await huaweiRequest(HUAWEI_AI_CONFIG.ocrUrl, payload);

    // 解析华为云 OCR 返回
    if (result.words) {
      return result.words.map(w => w.text).join('\n');
    }
    if (result.result?.words) {
      return result.result.words.map(w => w.text || w).join('\n');
    }
    return '';
  } catch (err) {
    console.error('图片OCR失败:', err.message);
    return '';
  }
}

/**
 * 素材文本分类
 * @param {string} text - 文本内容
 * @returns {string} 分类标签
 */
function classifyMaterial(text) {
  const keywords = {
    casualties: ['死亡', '受伤', '失联', '伤亡', '遇难', '被困', '送医', '重症', '轻伤', '重伤', '遗体'],
    response_progress: ['救援', '疏散', '出动', '消防', '搜救', '医疗队', '安置', '帐篷', '物资', '运输', '转移', '抢险'],
    coordination: ['请求', '支援', '短缺', '急需', '协调', '求助', '不够', '缺乏', '需要', '申请', '调拨'],
    site_conditions: ['坍塌', '倒塌', '损毁', '裂缝', '滑坡', '火灾', '洪水', '断裂', '受损', '浸泡', '倾斜']
  };

  for (const [category, words] of Object.entries(keywords)) {
    for (const kw of words) {
      if (text.includes(kw)) return category;
    }
  }
  return 'event_overview';
}

/**
 * 检测素材中的矛盾信息
 * @param {Array} materials - 素材数组
 * @returns {Array} 矛盾信息列表
 */
function detectConflicts(materials) {
  const conflicts = [];

  // 按关键词分组（如"死亡"、"受伤"等），组内检测不同数值
  const groups = {};
  for (const m of materials) {
    const text = m.content || m.voice_text || '';
    const matches = text.matchAll(/(\d+)\s*人/g);
    for (const match of matches) {
      const prefix = text.substring(0, match.index);
      const kwMatch = prefix.match(/(死亡|受伤|失联|遇难|被困|送医|疏散|转移)(?:了|约|近|共)*$/);
      const kw = kwMatch ? kwMatch[1] : '其他';
      if (!groups[kw]) groups[kw] = new Set();
      groups[kw].add(match[1]);
    }
  }

  for (const [kw, vals] of Object.entries(groups)) {
    if (vals.size > 1) {
      conflicts.push({
        type: 'number_conflict',
        description: kw + '人数冲突：' + [...vals].join(' vs '),
        sources: [{ keyword: kw, values: [...vals] }]
      });
    }
  }

  return conflicts;
}

module.exports = {
  voiceToText,
  imageOcr,
  classifyMaterial,
  detectConflicts
};
