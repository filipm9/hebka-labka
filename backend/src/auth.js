import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: '7d',
  });
}

export function authRequired(req, res, next) {
  const token = req.cookies[config.sessionName];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

