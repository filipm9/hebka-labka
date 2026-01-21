-- Add cosmetics_used column to track cosmetic products used on dogs
-- Stores array of objects: [{product: "product_name", notes: "how it was used"}, ...]
alter table dogs add column if not exists cosmetics_used jsonb default '[]'::jsonb;
