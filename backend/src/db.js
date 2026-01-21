import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.dbUrl,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function migrateCheck() {
  await pool.query('select 1');
}


export async function runMigrations() {
  // Add health_notes column if it doesn't exist
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dogs' AND column_name = 'health_notes'
      ) THEN
        ALTER TABLE dogs ADD COLUMN health_notes text;
      END IF;
    END $$;
  `);
}
