create table if not exists users (
  id serial primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamp with time zone default now()
);

create table if not exists owners (
  id serial primary key,
  name text not null,
  phone text,
  email text,
  address text,
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
  grooming_time_minutes integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create extension if not exists pg_trgm;

create index if not exists idx_dogs_name on dogs using gin (name gin_trgm_ops);
create index if not exists idx_owners_name on owners using gin (name gin_trgm_ops);
create index if not exists idx_dogs_owner on dogs(owner_id);

-- seed single user; replace hash with bcrypt hash of your password
-- insert into users (email, password_hash) values ('you@example.com', '$2a$10$...');

