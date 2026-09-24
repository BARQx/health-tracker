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
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT
          id,
          to_char(recorded_date, 'YYYY-MM-DD') AS date,
          weight_kg::float AS weight,
          notes,
          tags,
          measurements,
          updated_at AS "updatedAt"
        FROM weight_records
        ORDER BY recorded_date ASC
      `;
      return res.status(200).json({ records: rows });
    }

    if (req.method === 'POST') {
      const { date, weight, notes, tags, measurements } = req.body || {};

      if (!date || isNaN(Date.parse(date))) {
        return res.status(400).json({ error: 'Valid entry date (YYYY-MM-DD) is required' });
      }

      const parsedWeight = Number(weight);
      if (isNaN(parsedWeight) || parsedWeight <= 20 || parsedWeight >= 500) {
        return res.status(400).json({ error: 'Weight must be a valid number between 20 kg and 500 kg' });
      }

      const cleanNotes = notes ? String(notes).trim().slice(0, 500) : null;
      const cleanTags = Array.isArray(tags) ? tags.map(t => String(t).trim().slice(0, 50)).filter(Boolean) : [];
      const cleanMeasurements = measurements && typeof measurements === 'object' ? measurements : {};

      const inserted = await sql`
        INSERT INTO weight_records (recorded_date, weight_kg, notes, tags, measurements, updated_at)
        VALUES (
          ${date}::date,
          ${parsedWeight},
          ${cleanNotes},
          ${cleanTags},
          ${JSON.stringify(cleanMeasurements)}::jsonb,
          now()
        )
        ON CONFLICT (recorded_date) DO UPDATE SET
          weight_kg = EXCLUDED.weight_kg,
          notes = EXCLUDED.notes,
          tags = EXCLUDED.tags,
          measurements = EXCLUDED.measurements,
          updated_at = now()
        RETURNING
          id,
          to_char(recorded_date, 'YYYY-MM-DD') AS date,
          weight_kg::float AS weight,
          notes,
          tags,
          measurements,
          updated_at AS "updatedAt"
      `;

      return res.status(200).json({ record: inserted[0] });
    }

    if (req.method === 'DELETE') {
      const date = req.query.date || req.body?.date;
      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required to delete an entry' });
      }

      await sql`
        DELETE FROM weight_records
        WHERE recorded_date = ${date}::date
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Records API error:', error);
    return res.status(500).json({ error: 'Failed to process weight records request' });
  }
}
