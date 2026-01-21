-- Add grooming_time_minutes column to track time spent grooming each dog
-- Stores number of minutes as integer
alter table dogs add column if not exists grooming_time_minutes integer;
