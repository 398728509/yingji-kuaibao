const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'yingji-kuaibao.db'));

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

function initDB() {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','reporter','reviewer','commander')),
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 事件表
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT NOT NULL,
      longitude REAL,
      latitude REAL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','closed','archived')),
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      closed_at TEXT
    );

    -- 素材表
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('text','photo','voice','video')),
      content TEXT,
      file_path TEXT,
      file_size INTEGER,
      duration INTEGER,
      thumbnail_path TEXT,
      ocr_text TEXT,
      voice_text TEXT,
      tags TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 快报表
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','final','archived')),
      content TEXT NOT NULL,
      summary TEXT,
      diff_notes TEXT,
      generated_by TEXT DEFAULT 'ai',
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (event_id) REFERENCES events(id)
    );

    -- 快报模板表
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 素材关联快报表（记录素材被哪期快报采用）
    CREATE TABLE IF NOT EXISTS report_materials (
      report_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      PRIMARY KEY (report_id, material_id),
      FOREIGN KEY (report_id) REFERENCES reports(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    -- 事件参与人表
    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_materials_event ON materials(event_id);
    CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
    CREATE INDEX IF NOT EXISTS idx_materials_created ON materials(created_at);
    CREATE INDEX IF NOT EXISTS idx_reports_event ON reports(event_id);
    CREATE INDEX IF NOT EXISTS idx_reports_version ON reports(event_id, version);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  `);

  // 初始化默认模板
  const existingTpl = db.prepare('SELECT id FROM templates WHERE is_default = 1').get();
  if (!existingTpl) {
    const defaultTemplate = {
      sections: [
        { key: 'event_overview', name: '事件概况', required: true },
        { key: 'casualties', name: '伤亡情况', required: true },
        { key: 'response_progress', name: '处置进展', required: true },
        { key: 'coordination', name: '需协调事项', required: true },
        { key: 'site_conditions', name: '现场情况', required: true }
      ]
    };
    db.prepare(`INSERT INTO templates (id, name, config, is_default) VALUES (?, ?, ?, 1)`)
      .run('default', '默认快报模板', JSON.stringify(defaultTemplate));
  }

  console.log('✅ 数据库初始化完成');
}

module.exports = { db, initDB };
