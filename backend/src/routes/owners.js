import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../auth.js';

export const ownersRouter = express.Router();

ownersRouter.use(authRequired);

ownersRouter.get('/', async (req, res) => {
  const search = req.query.search || '';
  const like = `%${search}%`;
  const breed = req.query.breed || '';
  const breedLike = `%${breed}%`;
  const contactTags = req.query.contactTags
    ? req.query.contactTags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  let contactTagCondition = '';
  const params = [search, like, breed, breedLike];

  if (contactTags.length > 0) {
    // Build condition for matching any of the contact tags
    const tagConditions = contactTags.map((_, i) => {
      params.push(contactTags[i]);
      return `EXISTS (
        SELECT 1 FROM jsonb_array_elements(o.communication_methods) AS cm
        WHERE cm->>'method' = $${params.length}
      )`;
    });
    contactTagCondition = `AND (${tagConditions.join(' OR ')})`;
  }

  const { rows } = await query(
    `
    select o.*, coalesce(count(d.id), 0) as dog_count
    from owners o
    left join dogs d on d.owner_id = o.id
    where ($1 = '' or 
      o.name ilike $2 or
      exists (
        select 1 
        from dogs d2
        where d2.owner_id = o.id
        and exists (
          select 1 
          from unnest(d2.grooming_tolerance::text[]) as tag
          where tag ilike $2
        )
      )
    )
    and ($3 = '' or exists (
      select 1 from dogs d3
      where d3.owner_id = o.id
      and d3.breed ilike $4
    ))
    ${contactTagCondition}
    group by o.id
    order by o.updated_at desc
    limit 50
    `,
    params,
  );
  res.json(rows);
});

ownersRouter.get('/:id', async (req, res) => {
  const { rows } = await query('select * from owners where id = $1', [req.params.id]);
  const owner = rows[0];
  if (!owner) return res.status(404).json({ error: 'Not found' });
  res.json(owner);
});

ownersRouter.post('/', async (req, res) => {
  const { name, communication_methods, important_info } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query(
    `
    insert into owners (name, communication_methods, important_info)
    values ($1, $2, $3)
    returning *
    `,
    [name, JSON.stringify(communication_methods || []), important_info || null],
  );
  res.status(201).json(rows[0]);
});

ownersRouter.put('/:id', async (req, res) => {
  const { name, communication_methods, important_info } = req.body || {};
  const { rows } = await query(
    `
    update owners
    set name = $1, communication_methods = $2, important_info = $3, updated_at = now()
    where id = $4
    returning *
    `,
    [name, JSON.stringify(communication_methods || []), important_info || null, req.params.id],
  );
  const owner = rows[0];
  if (!owner) return res.status(404).json({ error: 'Not found' });
  res.json(owner);
});

ownersRouter.delete('/:id', async (req, res) => {
  await query('delete from owners where id = $1', [req.params.id]);
  res.json({ ok: true });
});

