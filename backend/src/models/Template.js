const { db } = require('./database');

class TemplateModel {
  static create({ name, config, createdBy }) {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    db.prepare('INSERT INTO templates (id, name, config, created_by) VALUES (?, ?, ?, ?)').run(id, name, JSON.stringify(config), createdBy || null);
    return this.getById(id);
  }

  static getById(id) {
    const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
    if (t) t.config = JSON.parse(t.config);
    return t;
  }

  static getDefault() {
    const t = db.prepare('SELECT * FROM templates WHERE is_default = 1 LIMIT 1').get();
    if (t) t.config = JSON.parse(t.config);
    return t;
  }

  static getActive() {
    return this.getDefault();
  }

  static list() {
    return db.prepare('SELECT * FROM templates ORDER BY created_at DESC').all().map(t => {
      t.config = JSON.parse(t.config);
      return t;
    });
  }

  static setDefault(id) {
    db.prepare('UPDATE templates SET is_default = 0 WHERE is_default = 1').run();
    db.prepare('UPDATE templates SET is_default = 1 WHERE id = ?').run(id);
  }
}

module.exports = TemplateModel;
