const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

class ReportModel {
  static create({ eventId, version, content, summary, diffNotes, generatedBy }) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO reports (id, event_id, version, content, summary, diff_notes, generated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, eventId, version, content, summary || '', diffNotes || '', generatedBy || 'ai');
    return this.getById(id);
  }

  static getById(id) {
    return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  }

  static getLatestByEvent(eventId) {
    return db.prepare('SELECT * FROM reports WHERE event_id = ? ORDER BY version DESC LIMIT 1').get(eventId);
  }

  static getLatestFinalByEvent(eventId) {
    return db.prepare("SELECT * FROM reports WHERE event_id = ? AND status = 'final' ORDER BY version DESC LIMIT 1").get(eventId);
  }

  static listByEvent(eventId) {
    return db.prepare('SELECT * FROM reports WHERE event_id = ? ORDER BY version DESC').all(eventId);
  }

  static getNextVersion(eventId) {
    const max = db.prepare('SELECT MAX(version) as v FROM reports WHERE event_id = ?').get(eventId);
    return (max?.v || 0) + 1;
  }

  static finalize(id, reviewerId) {
    db.prepare("UPDATE reports SET status = 'final', reviewed_by = ?, reviewed_at = datetime('now','localtime'), updated_at = datetime('now','localtime') WHERE id = ?").run(reviewerId, id);
    return this.getById(id);
  }

  static linkMaterials(reportId, materialIds) {
    const stmt = db.prepare('INSERT OR IGNORE INTO report_materials (report_id, material_id) VALUES (?, ?)');
    const tx = db.transaction((ids) => {
      for (const mid of ids) stmt.run(reportId, mid);
    });
    tx(materialIds);
  }

  static getLinkedMaterials(reportId) {
    return db.prepare(`
      SELECT m.*, u.display_name as user_name
      FROM report_materials rm
      JOIN materials m ON rm.material_id = m.id
      JOIN users u ON m.user_id = u.id
      WHERE rm.report_id = ?
    `).all(reportId);
  }

  static getStats(eventId) {
    const currentPeriod = db.prepare(`
      SELECT COUNT(*) as count FROM materials
      WHERE event_id = ? AND status = 'active'
      AND created_at > COALESCE(
        (SELECT MAX(created_at) FROM reports WHERE event_id = ?),
        datetime('now','-1 day')
      )
    `).get(eventId, eventId);
    return currentPeriod;
  }
}

module.exports = ReportModel;
