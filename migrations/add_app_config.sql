-- Migration: Add app_config table to store all configuration settings
-- This replaces localStorage-based configuration with database storage

CREATE TABLE IF NOT EXISTS app_config (
  id serial PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default values for all configuration types
INSERT INTO app_config (config_key, config_value) VALUES
  ('health_tags', '["Smrdí", "Pĺzne", "Kúše"]'::jsonb),
  ('character_tags', '["Priateľský", "Bojazlivý", "Agresívny"]'::jsonb),
  ('breeds', '["Zlatý retriever", "Labrador", "Nemecký ovčiak", "Pudel", "Bígl", "Yorkshirský teriér"]'::jsonb),
  ('cosmetics', '["Šampón na citlivú pokožku", "Kondicionér", "Sprej na rozčesávanie", "Parfum"]'::jsonb),
  ('communication_methods', '["WhatsApp", "Instagram", "Phone"]'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);
