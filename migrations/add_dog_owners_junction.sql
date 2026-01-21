-- Migration: Convert dog-owner relationship from 1:M to M:M
-- Creates a junction table dog_owners to support multiple owners per dog

-- Step 1: Create the junction table
CREATE TABLE IF NOT EXISTS dog_owners (
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (dog_id, owner_id)
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dog_owners_dog_id ON dog_owners(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_owners_owner_id ON dog_owners(owner_id);

-- Step 3: Migrate existing data from dogs.owner_id to dog_owners
INSERT INTO dog_owners (dog_id, owner_id)
SELECT id, owner_id FROM dogs WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 4: Drop the old owner_id column and its index
DROP INDEX IF EXISTS idx_dogs_owner;
ALTER TABLE dogs DROP COLUMN IF EXISTS owner_id;
