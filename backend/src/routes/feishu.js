const express = require('express');
const router = express.Router();

// 发送飞书消息
router.post('/send', async (req, res) => {
  const { target, targetType, content } = req.body;
  // targetType: 'chat_id' | 'open_id' | 'user_id'
  if (!target || !content) {
    return res.status(400).json({ error: '缺少必填字段: target, content' });
  }
  const receiveIdType = targetType || 'chat_id';
  try {
    const { feishuClient } = require('../services/feishu');
    if (!feishuClient) {
      return res.status(500).json({ error: '飞书客户端未初始化，请检查 FEISHU_APP_ID / FEISHU_APP_SECRET' });
    }
    const result = await feishuClient.im.message.create({
      params: { receive_id_type: receiveIdType },
      data: {
        receive_id: target,
        msg_type: 'text',
        content: JSON.stringify({ text: content })
      }
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('❌ 飞书发送消息失败:', err);
    res.status(500).json({ error: err.message || '发送失败' });
  }
});

module.exports = router;
