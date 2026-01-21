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
  // Create app_config table for storing configuration (replaces localStorage)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      id serial PRIMARY KEY,
      config_key text NOT NULL UNIQUE,
      config_value jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );
  `);

  // Insert default config values if they don't exist
  await pool.query(`
    INSERT INTO app_config (config_key, config_value) VALUES
      ('health_tags', '["Smrdí", "Pĺzne", "Kúše"]'::jsonb),
      ('character_tags', '["Priateľský", "Bojazlivý", "Agresívny"]'::jsonb),
      ('breeds', '["Zlatý retriever", "Labrador", "Nemecký ovčiak", "Pudel", "Bígl", "Yorkshirský teriér"]'::jsonb),
      ('cosmetics', '["Šampón na citlivú pokožku", "Kondicionér", "Sprej na rozčesávanie", "Parfum"]'::jsonb),
      ('communication_methods', '["WhatsApp", "Instagram", "Phone"]'::jsonb)
    ON CONFLICT (config_key) DO NOTHING;
  `);

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

  // Update owners table: remove old fields and add new communication fields
  await pool.query(`
    DO $$
    BEGIN
      -- Remove old columns if they exist
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'phone'
      ) THEN
        ALTER TABLE owners DROP COLUMN phone;
      END IF;
      
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'email'
      ) THEN
        ALTER TABLE owners DROP COLUMN email;
      END IF;
      
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'address'
      ) THEN
        ALTER TABLE owners DROP COLUMN address;
      END IF;
      
      -- Add new columns if they don't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'communication_methods'
      ) THEN
        ALTER TABLE owners ADD COLUMN communication_methods jsonb DEFAULT '[]'::jsonb;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'important_info'
      ) THEN
        ALTER TABLE owners ADD COLUMN important_info text;
      END IF;
    END $$;
  `);
}
