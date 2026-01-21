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
  grooming_time_minutes integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists dog_owners (
  dog_id integer not null references dogs(id) on delete cascade,
  owner_id integer not null references owners(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (dog_id, owner_id)
);

create index if not exists idx_dogs_name on dogs using gin (name gin_trgm_ops);
create index if not exists idx_owners_name on owners using gin (name gin_trgm_ops);
create index if not exists idx_dog_owners_dog_id on dog_owners(dog_id);
create index if not exists idx_dog_owners_owner_id on dog_owners(owner_id);

-- App config table for storing configuration values (tags, breeds, cosmetics, etc.)
create table if not exists app_config (
  id serial primary key,
  config_key text not null unique,
  config_value jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_app_config_key on app_config(config_key);

-- Seed default login (email: admin@example.com, password: changeme)
insert into users (email, password_hash)
values ('admin@example.com', crypt('changeme', gen_salt('bf')))
on conflict (email) do nothing;

-- Seed default config values
insert into app_config (config_key, config_value) values
  ('health_tags', '["Smrdí", "Pĺzne", "Kúše"]'::jsonb),
  ('character_tags', '["Priateľský", "Bojazlivý", "Agresívny"]'::jsonb),
  ('breeds', '["Zlatý retriever", "Labrador", "Nemecký ovčiak", "Pudel", "Bígl", "Yorkshirský teriér"]'::jsonb),
  ('cosmetics', '["Šampón na citlivú pokožku", "Kondicionér", "Sprej na rozčesávanie", "Parfum"]'::jsonb),
  ('communication_methods', '["WhatsApp", "Instagram", "Phone"]'::jsonb)
on conflict (config_key) do nothing;
