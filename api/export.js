import { isAuthorized } from './_lib/auth.js';
import { getDb } from './_lib/db.js';

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let sql;
  try {
    sql = getDb();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const format = (req.query.format || 'json').toLowerCase();

    const profileRows = await sql`
      SELECT name, birth_date AS "birthDate", sex, height_cm AS "heightCm", target_weight_kg AS "targetWeightKg"
      FROM profile WHERE id = true
    `;
    const profile = profileRows[0] || null;

    const records = await sql`
      SELECT to_char(recorded_date, 'YYYY-MM-DD') AS date, weight_kg::float AS weight, notes, tags
      FROM weight_records
      ORDER BY recorded_date ASC
    `;

    if (format === 'csv') {
      const header = 'Date,Weight (kg),Notes,Tags\n';
      const rows = records.map(r => {
        const escapedNotes = `"${(r.notes || '').replace(/"/g, '""')}"`;
        const escapedTags = `"${(r.tags || []).join('; ')}"`;
        return `${r.date},${r.weight},${escapedNotes},${escapedTags}`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="health_tracker_export.csv"');
      return res.status(200).send(header + rows);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="health_tracker_backup.json"');
    return res.status(200).json({
      exportDate: new Date().toISOString(),
      profile,
      records
    });
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
}
