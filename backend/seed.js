const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const db = new Database(path.join(DB_DIR, 'yingji-kuaibao.db'));

async function seed() {
  const defaultPassword = process.env.SEED_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    db.prepare('INSERT INTO users (id, username, password_hash, display_name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), 'admin', passwordHash, '管理员', 'admin', '13800000000');
    console.log('✅ 管理员账号创建成功: admin / admin123');
  } else {
    console.log('ℹ️ 管理员账号已存在');
  }

  // Also create demo accounts
  const accounts = [
    { username: 'reporter1', displayName: '信息采集员小王', role: 'reporter', phone: '13800000001' },
    { username: 'reviewer1', displayName: '审阅老张', role: 'reviewer', phone: '13800000002' },
    { username: 'commander1', displayName: '指挥长', role: 'commander', phone: '13800000003' },
  ];

  for (const acc of accounts) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(acc.username);
    if (!exists) {
      db.prepare('INSERT INTO users (id, username, password_hash, display_name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), acc.username, passwordHash, acc.displayName, acc.role, acc.phone);
      console.log('✅ 用户创建成功:', acc.username, '/ ' + defaultPassword);
    }
  }
}

seed().then(() => {
  console.log('🎉 种子数据完成！');
  process.exit(0);
}).catch(err => {
  console.error('❌ 种子数据失败:', err);
  process.exit(1);
});
