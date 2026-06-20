const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'yingji-kuaibao.db'));

db.pragma('journal_mode = WAL');

function initDB() {
  try { db.exec("ALTER TABLE users ADD COLUMN unit TEXT"); } catch(e) { }
  try { db.exec("ALTER TABLE users ADD COLUMN invite_code TEXT"); } catch(e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','reporter','reviewer','commander')),
      phone TEXT,
      unit TEXT,
      invite_code TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','pending','disabled')),
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

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

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS report_materials (
      report_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      PRIMARY KEY (report_id, material_id),
      FOREIGN KEY (report_id) REFERENCES reports(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      used_by TEXT,
      used_at TEXT,
      expires_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_materials_event ON materials(event_id);
    CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id);
    CREATE INDEX IF NOT EXISTS idx_materials_created ON materials(created_at);
    CREATE INDEX IF NOT EXISTS idx_reports_event ON reports(event_id);
    CREATE INDEX IF NOT EXISTS idx_reports_version ON reports(event_id, version);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
  `);

  const existingTpl = db.prepare('SELECT id FROM templates WHERE is_default = 1').get();
  if (!existingTpl) {
    const defaultTemplate = {
      sections: [
        { key: 'event_overview', name: '\u4e8b\u4ef6\u6982\u51b5', required: true },
        { key: 'casualties', name: '\u4f24\u4ea1\u60c5\u51b5', required: true },
        { key: 'response_progress', name: '\u5904\u7f6e\u8fdb\u5c55', required: true },
        { key: 'coordination', name: '\u9700\u534f\u8c03\u4e8b\u9879', required: true },
        { key: 'site_conditions', name: '\u73b0\u573a\u60c5\u51b5', required: true }
      ]
    };
    db.prepare('INSERT INTO templates (id, name, config, is_default) VALUES (?, ?, ?, 1)')
      .run('default', '\u9ed8\u8ba4\u5feb\u62a5\u6a21\u677f', JSON.stringify(defaultTemplate));
  }

  console.log('\u2705 \u6570\u636e\u5e93\u521d\u59cb\u5316\u5b8c\u6210');
}

module.exports = { db, initDB };
