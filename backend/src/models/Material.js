const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

class MaterialModel {
  static create({ eventId, userId, type, content, filePath, fileSize, duration, thumbnailPath, tags }) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO materials (id, event_id, user_id, type, content, file_path, file_size, duration, thumbnail_path, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, eventId, userId, type, content || '', filePath || null, fileSize || null, duration || null, thumbnailPath || null, tags || '');
    return this.getById(id);
  }

  static getById(id) {
    return db.prepare(`
      SELECT m.*, u.display_name as user_name
      FROM materials m JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);
  }

  static listByEvent(eventId) {
    return db.prepare(`
      SELECT m.*, u.display_name as user_name
      FROM materials m JOIN users u ON m.user_id = u.id
      WHERE m.event_id = ? AND m.status = 'active'
      ORDER BY m.created_at DESC
    `).all(eventId);
  }

  static listByEventSince(eventId, since) {
    return db.prepare(`
      SELECT m.*, u.display_name as user_name
      FROM materials m JOIN users u ON m.user_id = u.id
      WHERE m.event_id = ? AND m.status = 'active' AND m.created_at > ?
      ORDER BY m.created_at DESC
    `).all(eventId, since);
  }

  static countByEvent(eventId) {
    return db.prepare("SELECT COUNT(*) as c FROM materials WHERE event_id = ? AND status = 'active'").get(eventId).c;
  }

  static countNewSince(eventId, since) {
    const row = db.prepare("SELECT COUNT(*) as c FROM materials WHERE event_id = ? AND status = 'active' AND created_at > ?").get(eventId, since);
    return row ? row.c : 0;
  }

  static updateVoiceText(id, text) {
    db.prepare('UPDATE materials SET voice_text = ? WHERE id = ?').run(text, id);
    return this.getById(id);
  }

  static updateOcrText(id, text) {
    db.prepare('UPDATE materials SET ocr_text = ? WHERE id = ?').run(text, id);
    return this.getById(id);
  }

  static delete(id) {
    db.prepare("UPDATE materials SET status = 'deleted' WHERE id = ?").run(id);
  }
}

module.exports = MaterialModel;
