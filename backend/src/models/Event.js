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
    let rows;
    if (status) {
      rows = db.prepare('SELECT * FROM events WHERE status = ? ORDER BY created_at DESC').all(status);
    } else {
      rows = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
    }
    // 附加统计信息
    return rows.map(e => ({
      ...e,
      materialCount: db.prepare('SELECT COUNT(*) as c FROM materials WHERE event_id = ?').get(e.id).c,
      reportCount: db.prepare('SELECT COUNT(*) as c FROM reports WHERE event_id = ?').get(e.id).c,
      latestReport: db.prepare('SELECT created_at, version FROM reports WHERE event_id = ? ORDER BY version DESC LIMIT 1').get(e.id) || null
    }));
  }

  static update(id, data) {
    const fields = [];
    const values = [];
    for (const [k, v] of Object.entries(data)) {
      if (['title', 'description', 'location', 'longitude', 'latitude', 'status'].includes(k)) {
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
