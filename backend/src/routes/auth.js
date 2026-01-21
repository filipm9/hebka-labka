import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, authRequired } from '../auth.js';
import { config } from '../config.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const { rows } = await query('select * from users where email = $1', [email]);
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  res.cookie(config.sessionName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true });
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie(config.sessionName);
  res.json({ ok: true });
});

authRouter.get('/me', authRequired, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});

// Change password for logged-in user
authRouter.put('/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password required' });
  }

  // Get user's current password hash
  const { rows } = await query('select password_hash from users where id = $1', [req.user.id]);
  const user = rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid current password' });
  }

  // Hash and update to new password
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('update users set password_hash = $1 where id = $2', [passwordHash, req.user.id]);
  res.json({ ok: true });
});
