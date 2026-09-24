CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User profile table (single-user profile)
CREATE TABLE IF NOT EXISTS profile (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  birth_date DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  height_cm NUMERIC(5, 2) NOT NULL CHECK (height_cm > 30 AND height_cm < 300),
  target_weight_kg NUMERIC(5, 2) CHECK (target_weight_kg IS NULL OR (target_weight_kg > 20 AND target_weight_kg < 500)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily weight records table
CREATE TABLE IF NOT EXISTS weight_records (
  id SERIAL PRIMARY KEY,
  recorded_date DATE NOT NULL UNIQUE,
  weight_kg NUMERIC(5, 2) NOT NULL CHECK (weight_kg > 20 AND weight_kg < 500),
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weight_records_date_idx ON weight_records (recorded_date ASC);

-- Stored function to fetch full health data payload in a single query
CREATE OR REPLACE FUNCTION get_health_data() RETURNS JSONB
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) FROM (
        SELECT name, birth_date AS "birthDate", sex, height_cm AS "heightCm", target_weight_kg AS "targetWeightKg", updated_at AS "updatedAt"
        FROM profile WHERE id = true
      ) p
    ),
    'records', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'date', r.recorded_date,
          'weight', r.weight_kg,
          'notes', r.notes,
          'tags', r.tags,
          'measurements', r.measurements,
          'updatedAt', r.updated_at
        ) ORDER BY r.recorded_date ASC
      )
      FROM weight_records r
    ), '[]'::jsonb)
  );
$$;
