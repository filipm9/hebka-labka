-- Remove old fields and add new communication methods and important info fields
alter table owners 
  drop column if exists phone,
  drop column if exists email,
  drop column if exists address,
  add column if not exists communication_methods jsonb default '[]'::jsonb,
  add column if not exists important_info text;
