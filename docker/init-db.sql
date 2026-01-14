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
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_dogs_name on dogs using gin (name gin_trgm_ops);
create index if not exists idx_owners_name on owners using gin (name gin_trgm_ops);
create index if not exists idx_dogs_owner on dogs(owner_id);

-- Seed default login (email: admin@example.com, password: changeme)
insert into users (email, password_hash)
values ('admin@example.com', crypt('changeme', gen_salt('bf')))
on conflict (email) do nothing;

