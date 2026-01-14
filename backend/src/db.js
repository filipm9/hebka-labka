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

