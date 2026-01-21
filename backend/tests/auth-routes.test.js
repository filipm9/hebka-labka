import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRouter } from '../src/routes/auth.js';
import { query } from '../src/db.js';

vi.mock('../src/db.js', () => ({
  query: vi.fn(),
}));

vi.mock('../src/config.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    sessionName: 'session',
    cookieSecure: false,
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRouter);
  return app;
}

function authCookie(userId = 1) {
  const token = jwt.sign({ id: userId, email: 'test@test.com' }, 'test-secret');
  return `session=${token}`;
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10);
      query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@test.com', password_hash: hash }],
      });

      const res = await request(createApp())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@test.com', password_hash: hash }],
      });

      const res = await request(createApp())
        .post('/auth/login')
        .send({ email: 'user@test.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should require email and password', async () => {
      const res = await request(createApp())
        .post('/auth/login')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password required');
    });

    it('should require password', async () => {
      const res = await request(createApp())
        .post('/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password required');
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear the session cookie', async () => {
      const res = await request(createApp()).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user info with valid token', async () => {
      const res = await request(createApp())
        .get('/auth/me')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 1, email: 'test@test.com' });
    });

    it('should return 401 without token', async () => {
      const res = await request(createApp()).get('/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /auth/password', () => {
    it('should change password with valid current password', async () => {
      const currentHash = await bcrypt.hash('oldpassword', 10);
      query
        .mockResolvedValueOnce({ rows: [{ password_hash: currentHash }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .put('/auth/password')
        .set('Cookie', authCookie())
        .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should reject invalid current password', async () => {
      const currentHash = await bcrypt.hash('correct-old-password', 10);
      query.mockResolvedValueOnce({ rows: [{ password_hash: currentHash }] });

      const res = await request(createApp())
        .put('/auth/password')
        .set('Cookie', authCookie())
        .send({ currentPassword: 'wrong-old-password', newPassword: 'newpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid current password');
    });

    it('should require both passwords', async () => {
      const res = await request(createApp())
        .put('/auth/password')
        .set('Cookie', authCookie())
        .send({ newPassword: 'newpassword' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Current password and new password required');
    });
  });
});
