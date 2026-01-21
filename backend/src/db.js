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
  // Create base tables if they don't exist (for fresh deployments like Railway)
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS owners (
      id serial PRIMARY KEY,
      name text NOT NULL,
      communication_methods jsonb DEFAULT '[]'::jsonb,
      important_info text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dogs (
      id serial PRIMARY KEY,
      name text NOT NULL,
      breed text,
      weight numeric,
      birthdate date,
      behavior_notes text,
      grooming_tolerance text[] DEFAULT '{}',
      health_notes text,
      character_tags text[] DEFAULT '{}',
      character_notes text,
      cosmetics_used jsonb DEFAULT '[]'::jsonb,
      grooming_time_minutes integer,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dog_owners (
      dog_id integer NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
      owner_id integer NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      created_at timestamp with time zone DEFAULT now(),
      PRIMARY KEY (dog_id, owner_id)
    );

    CREATE INDEX IF NOT EXISTS idx_dogs_name ON dogs USING gin (name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_owners_name ON owners USING gin (name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_dog_owners_dog_id ON dog_owners(dog_id);
    CREATE INDEX IF NOT EXISTS idx_dog_owners_owner_id ON dog_owners(owner_id);

    -- Seed default login (email: admin@example.com, password: changeme)
    INSERT INTO users (email, password_hash)
    VALUES ('admin@example.com', crypt('changeme', gen_salt('bf')))
    ON CONFLICT (email) DO NOTHING;
  `);

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

  // Add health_notes column if it doesn't exist (legacy migration)
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

  // Update owners table: remove old fields and add new communication fields (legacy migration)
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
