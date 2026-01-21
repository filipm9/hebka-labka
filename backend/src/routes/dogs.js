import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../auth.js';

export const dogsRouter = express.Router();

dogsRouter.use(authRequired);

dogsRouter.get('/', async (req, res) => {
  try {
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
      select 
        d.*,
        coalesce(
          (
            select json_agg(json_build_object('id', o.id, 'name', o.name) order by o.name)
            from dog_owners do2
            join owners o on o.id = do2.owner_id
            where do2.dog_id = d.id
          ),
          '[]'::json
        ) as owners
      from dogs d
      where ($1 = '' or 
        d.name ilike $2 or 
        exists (
          select 1 
          from dog_owners do3
          join owners o2 on o2.id = do3.owner_id
          where do3.dog_id = d.id and o2.name ilike $2
        ) or
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
  } catch (error) {
    console.error('Get dogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

dogsRouter.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `
      select 
        d.*,
        coalesce(
          (
            select json_agg(json_build_object('id', o.id, 'name', o.name) order by o.name)
            from dog_owners do2
            join owners o on o.id = do2.owner_id
            where do2.dog_id = d.id
          ),
          '[]'::json
        ) as owners
      from dogs d
      where d.id = $1
      `,
      [req.params.id],
    );
    const dog = rows[0];
    if (!dog) return res.status(404).json({ error: 'Not found' });
    res.json(dog);
  } catch (error) {
    console.error('Get dog by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

dogsRouter.post('/', async (req, res) => {
  try {
    const { owner_ids, name, breed, weight, birthdate, behavior_notes, grooming_tolerance, health_notes, character_tags, character_notes, cosmetics_used, grooming_time_minutes } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const tolerance = Array.isArray(grooming_tolerance) ? grooming_tolerance : [];
    const charTags = Array.isArray(character_tags) ? character_tags : [];
    const cosmetics = Array.isArray(cosmetics_used) ? cosmetics_used : [];
    const ownerIds = Array.isArray(owner_ids) ? owner_ids.filter(Boolean) : [];
    
    // Insert the dog
    const { rows } = await query(
      `
      insert into dogs (name, breed, weight, birthdate, behavior_notes, grooming_tolerance, health_notes, character_tags, character_notes, cosmetics_used, grooming_time_minutes)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      returning *
      `,
      [
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
    
    const dog = rows[0];
    
    // Insert owner associations
    if (ownerIds.length > 0) {
      const values = ownerIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await query(
        `insert into dog_owners (dog_id, owner_id) values ${values}`,
        [dog.id, ...ownerIds],
      );
    }
    
    // Fetch the dog with owners for response
    const { rows: finalRows } = await query(
      `
      select 
        d.*,
        coalesce(
          (
            select json_agg(json_build_object('id', o.id, 'name', o.name) order by o.name)
            from dog_owners do2
            join owners o on o.id = do2.owner_id
            where do2.dog_id = d.id
          ),
          '[]'::json
        ) as owners
      from dogs d
      where d.id = $1
      `,
      [dog.id],
    );
    
    res.status(201).json(finalRows[0]);
  } catch (error) {
    console.error('Create dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

dogsRouter.put('/:id', async (req, res) => {
  try {
    const { owner_ids, name, breed, weight, birthdate, behavior_notes, grooming_tolerance, health_notes, character_tags, character_notes, cosmetics_used, grooming_time_minutes } = req.body || {};
    const tolerance = Array.isArray(grooming_tolerance) ? grooming_tolerance : [];
    const charTags = Array.isArray(character_tags) ? character_tags : [];
    const cosmetics = Array.isArray(cosmetics_used) ? cosmetics_used : [];
    const ownerIds = Array.isArray(owner_ids) ? owner_ids.filter(Boolean) : [];
    
    const { rows } = await query(
      `
      update dogs
      set name = $1,
          breed = $2,
          weight = $3,
          birthdate = $4,
          behavior_notes = $5,
          grooming_tolerance = $6,
          health_notes = $7,
          character_tags = $8,
          character_notes = $9,
          cosmetics_used = $10,
          grooming_time_minutes = $11,
          updated_at = now()
      where id = $12
      returning *
      `,
      [
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
    
    // Update owner associations: delete existing and insert new
    await query('delete from dog_owners where dog_id = $1', [dog.id]);
    
    if (ownerIds.length > 0) {
      const values = ownerIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await query(
        `insert into dog_owners (dog_id, owner_id) values ${values}`,
        [dog.id, ...ownerIds],
      );
    }
    
    // Fetch the dog with owners for response
    const { rows: finalRows } = await query(
      `
      select 
        d.*,
        coalesce(
          (
            select json_agg(json_build_object('id', o.id, 'name', o.name) order by o.name)
            from dog_owners do2
            join owners o on o.id = do2.owner_id
            where do2.dog_id = d.id
          ),
          '[]'::json
        ) as owners
      from dogs d
      where d.id = $1
      `,
      [dog.id],
    );
    
    res.json(finalRows[0]);
  } catch (error) {
    console.error('Update dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

dogsRouter.delete('/:id', async (req, res) => {
  try {
    await query('delete from dogs where id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete dog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
