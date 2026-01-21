import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authRequired } from '../auth.js';

export const usersRouter = express.Router();

usersRouter.use(authRequired);

// List all users
usersRouter.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `
      select id, email, created_at
      from users
      order by created_at desc
      `,
    );
    res.json(rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user
usersRouter.post('/', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    const { rows: existing } = await query('select id from users where email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `
      insert into users (email, password_hash)
      values ($1, $2)
      returning id, email, created_at
      `,
      [email, passwordHash],
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password for a specific user (by admin)
usersRouter.put('/:id/password', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const { rows: existing } = await query('select id from users where id = $1', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query('update users set password_hash = $1 where id = $2', [passwordHash, req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Change user password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
usersRouter.delete('/:id', async (req, res) => {
  try {
    // Prevent deleting yourself
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const { rows } = await query('delete from users where id = $1 returning id', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
