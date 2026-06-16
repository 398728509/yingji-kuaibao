const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { setupWebSocket } = require('./websocket');
const { initDB } = require('./models/database');
const { initCycles } = require('./services/reportScheduler');
const eventRoutes = require('./routes/events');
const materialRoutes = require('./routes/materials');
const reportRoutes = require('./routes/reports');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const templateRoutes = require('./routes/templates');

const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '应急快报后端', version: '0.1.0' });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/templates', templateRoutes);

// WebSocket
const wss = setupWebSocket(server);

// 初始化数据库
initDB();

// 启动定时生成周期
initCycles();

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚨 应急快报后端服务启动 - 端口 ${PORT}`);
  console.log(`📡 WebSocket 服务已就绪`);
});

module.exports = { app, server, wss };
