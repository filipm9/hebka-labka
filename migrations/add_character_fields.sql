-- Migration: Add character_tags and character_notes columns to dogs table
-- Run this against your existing database to add the new Povaha fields

ALTER TABLE dogs ADD COLUMN IF NOT EXISTS character_tags text[] DEFAULT '{}';
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS character_notes text;
