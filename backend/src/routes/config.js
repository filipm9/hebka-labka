import express from 'express';
import { query } from '../db.js';
import { authRequired } from '../auth.js';

export const configRouter = express.Router();

configRouter.use(authRequired);

// Get all config values
configRouter.get('/', async (req, res) => {
  const { rows } = await query('SELECT config_key, config_value FROM app_config');
  const config = {};
  for (const row of rows) {
    config[row.config_key] = row.config_value;
  }
  res.json(config);
});

// Get specific config value
configRouter.get('/:key', async (req, res) => {
  const { rows } = await query(
    'SELECT config_value FROM app_config WHERE config_key = $1',
    [req.params.key]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Config key not found' });
  }
  res.json(rows[0].config_value);
});

// Update specific config value
configRouter.put('/:key', async (req, res) => {
  const { value } = req.body;
  if (!Array.isArray(value)) {
    return res.status(400).json({ error: 'Value must be an array' });
  }
  
  const { rows } = await query(
    `INSERT INTO app_config (config_key, config_value)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (config_key) 
     DO UPDATE SET config_value = $2::jsonb, updated_at = now()
     RETURNING config_key, config_value`,
    [req.params.key, JSON.stringify(value)]
  );
  
  res.json(rows[0].config_value);
});
