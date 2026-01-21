import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../auth.js';

export const dogsRouter = express.Router();

dogsRouter.use(authRequired);

dogsRouter.get('/', async (req, res) => {
  const search = req.query.search || '';
  const like = `%${search}%`;
  const rawTags = typeof req.query.tags === 'string' ? req.query.tags : '';
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const tagsLower = tags.length ? tags.map((t) => t.toLowerCase()) : null;
  const rawCharTags = typeof req.query.characterTags === 'string' ? req.query.characterTags : '';
  const charTags = rawCharTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const charTagsLower = charTags.length ? charTags.map((t) => t.toLowerCase()) : null;
  const { rows } = await query(
    `
    select d.*, o.name as owner_name
    from dogs d
    join owners o on o.id = d.owner_id
    where ($1 = '' or 
      d.name ilike $2 or 
      o.name ilike $2 or
      exists (
        select 1 
        from unnest(d.grooming_tolerance::text[]) as tag
        where tag ilike $2
      ) or
      exists (
        select 1 
        from unnest(d.character_tags::text[]) as tag
        where tag ilike $2
      )
    )
    and (
      $3::text[] is null
      or exists (
        select 1
        from unnest(d.grooming_tolerance::text[]) as tag
        where lower(tag) = any($3::text[])
      )
    )
    and (
      $4::text[] is null
      or exists (
        select 1
        from unnest(d.character_tags::text[]) as tag
        where lower(tag) = any($4::text[])
      )
    )
    order by d.updated_at desc
    limit 50
    `,
    [search, like, tagsLower, charTagsLower],
  );
  res.json(rows);
});

dogsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(
    `
    select d.*, o.name as owner_name
    from dogs d
    join owners o on o.id = d.owner_id
    where d.id = $1
    `,
    [req.params.id],
  );
  const dog = rows[0];
  if (!dog) return res.status(404).json({ error: 'Not found' });
  res.json(dog);
});

dogsRouter.post('/', async (req, res) => {
  const { owner_id, name, breed, weight, birthdate, behavior_notes, grooming_tolerance, health_notes, character_tags, character_notes, cosmetics_used, grooming_time_minutes } = req.body || {};
  if (!owner_id || !name) return res.status(400).json({ error: 'owner_id and name required' });
  const tolerance = Array.isArray(grooming_tolerance) ? grooming_tolerance : [];
  const charTags = Array.isArray(character_tags) ? character_tags : [];
  const cosmetics = Array.isArray(cosmetics_used) ? cosmetics_used : [];
  
  const { rows } = await query(
    `
    insert into dogs (owner_id, name, breed, weight, birthdate, behavior_notes, grooming_tolerance, health_notes, character_tags, character_notes, cosmetics_used, grooming_time_minutes)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    returning *
    `,
    [
      owner_id,
      name,
      breed || null,
      weight || null,
      birthdate || null,
      behavior_notes || null,
      tolerance,
      health_notes || null,
      charTags,
      character_notes || null,
      JSON.stringify(cosmetics),
      grooming_time_minutes ? Number(grooming_time_minutes) : null,
    ],
  );
  res.status(201).json(rows[0]);
});

dogsRouter.put('/:id', async (req, res) => {
  const { owner_id, name, breed, weight, birthdate, behavior_notes, grooming_tolerance, health_notes, character_tags, character_notes, cosmetics_used, grooming_time_minutes } = req.body || {};
  const tolerance = Array.isArray(grooming_tolerance) ? grooming_tolerance : [];
  const charTags = Array.isArray(character_tags) ? character_tags : [];
  const cosmetics = Array.isArray(cosmetics_used) ? cosmetics_used : [];
  
  const { rows } = await query(
    `
    update dogs
    set owner_id = $1,
        name = $2,
        breed = $3,
        weight = $4,
        birthdate = $5,
        behavior_notes = $6,
        grooming_tolerance = $7,
        health_notes = $8,
        character_tags = $9,
        character_notes = $10,
        cosmetics_used = $11,
        grooming_time_minutes = $12,
        updated_at = now()
    where id = $13
    returning *
    `,
    [
      owner_id,
      name,
      breed || null,
      weight || null,
      birthdate || null,
      behavior_notes || null,
      tolerance,
      health_notes || null,
      charTags,
      character_notes || null,
      JSON.stringify(cosmetics),
      grooming_time_minutes ? Number(grooming_time_minutes) : null,
      req.params.id,
    ],
  );
  const dog = rows[0];
  if (!dog) return res.status(404).json({ error: 'Not found' });
  res.json(dog);
});

dogsRouter.delete('/:id', async (req, res) => {
  await query('delete from dogs where id = $1', [req.params.id]);
  res.json({ ok: true });
});

