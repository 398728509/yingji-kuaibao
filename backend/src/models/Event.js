const { db } = require('../models/database');
const { v4: uuidv4 } = require('uuid');

class EventModel {
  static create({ title, description, location, longitude, latitude, createdBy }) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO events (id, title, description, location, longitude, latitude, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description || '', location, longitude || null, latitude || null, createdBy);
    return this.getById(id);
  }

  static getById(id) {
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  }

  static list(status) {
    const sql = status
      ? `SELECT e.*,
          (SELECT COUNT(*) FROM materials WHERE event_id = e.id) as materialCount,
          (SELECT COUNT(*) FROM reports WHERE event_id = e.id) as reportCount
         FROM events e WHERE e.status = ? ORDER BY e.created_at DESC`
      : `SELECT e.*,
          (SELECT COUNT(*) FROM materials WHERE event_id = e.id) as materialCount,
          (SELECT COUNT(*) FROM reports WHERE event_id = e.id) as reportCount
         FROM events e ORDER BY e.created_at DESC`;
    const params = status ? [status] : [];
    const rows = db.prepare(sql).all(...params);
    return rows.map(e => ({
      ...e,
      latestReport: db.prepare('SELECT created_at, version FROM reports WHERE event_id = ? ORDER BY version DESC LIMIT 1').get(e.id) || null
    }));
  }

  static update(id, data) {
    // whitelist: only allow predefined fields
    const ALLOWED = new Set(['title', 'description', 'location', 'longitude', 'latitude', 'status']);
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(data)) {
      if (ALLOWED.has(k)) {
        fields.push(`${k} = ?`);
        values.push(v);
      }
    }
    if (fields.length === 0) return this.getById(id);
    fields.push('updated_at = datetime(\'now\',\'localtime\')');
    values.push(id);
    db.prepare(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  }

  static close(id) {
    db.prepare(`UPDATE events SET status = 'closed', closed_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
    return this.getById(id);
  }

  static archive(id) {
    db.prepare(`UPDATE events SET status = 'archived', updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
    return this.getById(id);
  }

  static addMember(eventId, userId, role) {
    db.prepare('INSERT OR REPLACE INTO event_members (event_id, user_id, role) VALUES (?, ?, ?)').run(eventId, userId, role);
  }

  static getMembers(eventId) {
    return db.prepare(`
      SELECT u.id, u.display_name, u.role as user_role, em.role as event_role, em.joined_at
      FROM event_members em JOIN users u ON em.user_id = u.id
      WHERE em.event_id = ?
    `).all(eventId);
  }

  static removeMember(eventId, userId) {
    db.prepare('DELETE FROM event_members WHERE event_id = ? AND user_id = ?').run(eventId, userId);
  }

  static getActiveEvents() {
    return db.prepare("SELECT * FROM events WHERE status = 'active' ORDER BY created_at DESC").all();
  }
}

module.exports = EventModel;
