const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('express-async-errors');

const { setupWebSocket } = require('./websocket');
const { initDB } = require('./models/database');
const { initCycles } = require('./services/reportScheduler');
const { authMiddleware } = require('./middleware/auth');
const eventRoutes = require('./routes/events');
const materialRoutes = require('./routes/materials');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const templateRoutes = require('./routes/templates');
const aiRoutes = require('./routes/ai');
const apiKeyRoutes = require('./routes/api-keys');
const { startFeishuBot } = require('./services/feishu');

const app = express();
const server = http.createServer(app);

// CORS 配置（通过 Nginx 反向代理时同源，放宽配置即可)
// 如需严格限制，设置环境变量 CORS_ORIGIN=https://your-domain.com
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : '*';
const corsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '应急快报后端', version: '0.1.0' });
});

// 路由（公开）
app.use('/api/auth', authRoutes);

// 以下路由需要认证
app.use('/api/events', authMiddleware, eventRoutes);
app.use('/api/materials', authMiddleware, materialRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/api-keys', apiKeyRoutes);
const feishuRoutes = require('./routes/feishu');
app.use('/api/feishu', feishuRoutes);


// WebSocket
const wss = setupWebSocket(server);

// 初始化数据库
initDB();

// 启动定时生成周期
initCycles();

// 启动飞书机器人长连接
try {
  startFeishuBot();
} catch (err) {
  console.error('⚠️ 飞书机器人启动失败:', err.message);
}

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('❌ 未捕获错误:', err.message || err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `文件上传错误: ${err.message}` });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大，请压缩后重试' });
  }
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误'
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚨 应急快报后端服务启动 - 端口 ${PORT}`);
  console.log(`📡 WebSocket 服务已就绪`);
});

module.exports = { app, server, wss };
