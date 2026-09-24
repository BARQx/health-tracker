import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../db/migrations');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  console.log('Connecting to Neon database and checking schema migrations...');

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const appliedRows = await sql`SELECT filename FROM schema_migrations`;
  const appliedSet = new Set(appliedRows.map(row => row.filename));

  const files = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();

  for (const filename of files) {
    if (appliedSet.has(filename)) {
      console.log(`[skip] ${filename} already applied`);
      continue;
    }

    console.log(`[apply] applying ${filename}...`);
    const content = await readFile(join(migrationsDir, filename), 'utf8');
    
    // Split on statements or execute directly
    await sql.transaction([
      sql(content),
      sql`INSERT INTO schema_migrations (filename) VALUES (${filename})`
    ]);
    console.log(`[done] applied ${filename}`);
  }

  console.log('Database schema is up to date.');
}

migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
