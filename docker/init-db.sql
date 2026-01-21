-- Initializes database, extensions, tables, and seeds default user.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table if not exists users (
  id serial primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamp with time zone default now()
);

create table if not exists owners (
  id serial primary key,
  name text not null,
  communication_methods jsonb default '[]'::jsonb,
  important_info text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists dogs (
  id serial primary key,
  owner_id integer not null references owners(id) on delete cascade,
  name text not null,
  breed text,
  weight numeric,
  birthdate date,
  behavior_notes text,
  grooming_tolerance text[] default '{}',
  health_notes text,
  character_tags text[] default '{}',
  character_notes text,
  cosmetics_used jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Migration: Add health_notes column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'dogs' and column_name = 'health_notes') then
    alter table dogs add column health_notes text;
  end if;
end $$;

-- Migration: Add character_tags and character_notes columns if they don't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'dogs' and column_name = 'character_tags') then
    alter table dogs add column character_tags text[] default '{}';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'dogs' and column_name = 'character_notes') then
    alter table dogs add column character_notes text;
  end if;
end $$;

-- Migration: Add cosmetics_used column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'dogs' and column_name = 'cosmetics_used') then
    alter table dogs add column cosmetics_used jsonb default '[]'::jsonb;
  end if;
end $$;

create index if not exists idx_dogs_name on dogs using gin (name gin_trgm_ops);
create index if not exists idx_owners_name on owners using gin (name gin_trgm_ops);
create index if not exists idx_dogs_owner on dogs(owner_id);

-- Seed default login (email: admin@example.com, password: changeme)
insert into users (email, password_hash)
values ('admin@example.com', crypt('changeme', gen_salt('bf')))
on conflict (email) do nothing;

