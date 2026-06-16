const WebSocket = require('ws');

let wss = null;

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('🔌 WebSocket 客户端已连接');

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        // 处理订阅
        if (msg.type === 'subscribe' && msg.eventId) {
          ws.eventId = msg.eventId;
          console.log(`  订阅事件: ${msg.eventId}`);
        }
      } catch (e) {
        // 忽略非 JSON 消息
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket 客户端断开');
    });

    // 发送连接确认
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket 已连接' }));
  });

  return wss;
}

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // 如果客户端订阅了该事件，或者广播全局消息
      if (!data.eventId || !client.eventId || client.eventId === data.eventId) {
        client.send(msg);
      }
    }
  });
}

function broadcastToEvent(eventId, data) {
  if (!wss) return;
  const msg = JSON.stringify({ ...data, eventId });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.eventId === eventId) {
      client.send(msg);
    }
  });
}

module.exports = { setupWebSocket, broadcast, broadcastToEvent };
