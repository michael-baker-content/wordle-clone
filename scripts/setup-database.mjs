import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED;
if (!url) throw new Error('Set DATABASE_URL or DATABASE_URL_POOLED in .env.local first.');
const sql = neon(url);
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
try {
  await sql.transaction(schema.split(';').filter(statement => statement.trim()).map(statement => sql.query(statement)));
  console.log('Jacklet database tables are ready. Existing results were preserved.');
} catch {
  console.error('Database setup failed. Check the connection settings and database permissions.');
  process.exitCode = 1;
}
