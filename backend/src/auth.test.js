import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, authRequired } from './auth.js';

vi.mock('./config.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    sessionName: 'test-session',
  },
}));

describe('signToken', () => {
  it('should create a valid JWT token', () => {
    const user = { id: 1, email: 'test@example.com' };
    const token = signToken(user);
    const decoded = jwt.verify(token, 'test-secret');

    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.exp).toBeDefined();
  });

  it('should set token expiration to 7 days', () => {
    const user = { id: 1, email: 'test@example.com' };
    const token = signToken(user);
    const decoded = jwt.verify(token, 'test-secret');

    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 7 * 24 * 60 * 60;
    expect(decoded.exp - now).toBeGreaterThan(sevenDays - 60);
    expect(decoded.exp - now).toBeLessThanOrEqual(sevenDays);
  });
});

describe('authRequired', () => {
  const createMockReqRes = (token = null) => ({
    req: { cookies: { 'test-session': token } },
    res: {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    },
    next: vi.fn(),
  });

  it('should call next() with valid token', () => {
    const token = jwt.sign({ id: 1, email: 'test@example.com' }, 'test-secret');
    const { req, res, next } = createMockReqRes(token);

    authRequired(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
    expect(req.user.email).toBe('test@example.com');
  });

  it('should return 401 without token', () => {
    const { req, res, next } = createMockReqRes(null);

    authRequired(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid token', () => {
    const { req, res, next } = createMockReqRes('invalid-token');

    authRequired(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with expired token', () => {
    const token = jwt.sign(
      { id: 1, email: 'test@example.com' },
      'test-secret',
      { expiresIn: '-1s' }
    );
    const { req, res, next } = createMockReqRes(token);

    authRequired(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
