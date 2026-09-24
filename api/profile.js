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
        SELECT name, birth_date AS "birthDate", sex, height_cm AS "heightCm", target_weight_kg AS "targetWeightKg", updated_at AS "updatedAt"
        FROM profile
        WHERE id = true
      `;
      if (rows.length === 0) {
        return res.status(200).json({ profile: null });
      }
      return res.status(200).json({ profile: rows[0] });
    }

    if (req.method === 'PUT') {
      const { name, birthDate, sex, heightCm, targetWeightKg } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (!birthDate || isNaN(Date.parse(birthDate))) {
        return res.status(400).json({ error: 'Valid birth date is required' });
      }
      if (!sex || !['male', 'female'].includes(String(sex).toLowerCase())) {
        return res.status(400).json({ error: 'Sex must be male or female' });
      }
      const parsedHeight = Number(heightCm);
      if (isNaN(parsedHeight) || parsedHeight <= 30 || parsedHeight >= 300) {
        return res.status(400).json({ error: 'Height must be between 30 cm and 300 cm' });
      }
      const parsedTarget = targetWeightKg ? Number(targetWeightKg) : null;
      if (parsedTarget !== null && (isNaN(parsedTarget) || parsedTarget <= 20 || parsedTarget >= 500)) {
        return res.status(400).json({ error: 'Target weight must be between 20 kg and 500 kg' });
      }

      await sql`
        INSERT INTO profile (id, name, birth_date, sex, height_cm, target_weight_kg, updated_at)
        VALUES (
          true,
          ${name.trim()},
          ${birthDate}::date,
          ${sex.toLowerCase()},
          ${parsedHeight},
          ${parsedTarget},
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          birth_date = EXCLUDED.birth_date,
          sex = EXCLUDED.sex,
          height_cm = EXCLUDED.height_cm,
          target_weight_kg = EXCLUDED.target_weight_kg,
          updated_at = now()
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ error: 'Failed to process profile request' });
  }
}
