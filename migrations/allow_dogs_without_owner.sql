-- Allow dogs to exist without an owner
ALTER TABLE dogs ALTER COLUMN owner_id DROP NOT NULL;
