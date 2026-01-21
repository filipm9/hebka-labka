import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { ownersRouter } from '../src/routes/owners.js';
import { query } from '../src/db.js';

vi.mock('../src/db.js', () => ({
  query: vi.fn(),
}));

vi.mock('../src/config.js', () => ({
  config: { jwtSecret: 'test-secret', sessionName: 'session' },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/owners', ownersRouter);
  return app;
}

function authCookie() {
  const token = jwt.sign({ id: 1, email: 'test@test.com' }, 'test-secret');
  return `session=${token}`;
}

describe('Owners API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /owners', () => {
    it('should return owners list', async () => {
      const mockOwners = [
        { id: 1, name: 'John Doe', dog_count: 2 },
        { id: 2, name: 'Jane Smith', dog_count: 1 },
      ];
      query.mockResolvedValueOnce({ rows: mockOwners });

      const res = await request(createApp())
        .get('/owners')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('John Doe');
    });

    it('should filter by search term', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await request(createApp())
        .get('/owners?search=john')
        .set('Cookie', authCookie());

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('where'),
        expect.arrayContaining(['john', '%john%'])
      );
    });

    it('should filter by breed', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await request(createApp())
        .get('/owners?breed=labrador')
        .set('Cookie', authCookie());

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('breed ilike'),
        expect.arrayContaining(['labrador', '%labrador%'])
      );
    });

    it('should return 401 without auth', async () => {
      const res = await request(createApp()).get('/owners');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /owners/:id', () => {
    it('should return a single owner', async () => {
      const mockOwner = { id: 1, name: 'John Doe' };
      query.mockResolvedValueOnce({ rows: [mockOwner] });

      const res = await request(createApp())
        .get('/owners/1')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('John Doe');
    });

    it('should return 404 for non-existent owner', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .get('/owners/999')
        .set('Cookie', authCookie());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /owners', () => {
    it('should create an owner with valid data', async () => {
      const newOwner = { id: 1, name: 'John Doe' };
      query.mockResolvedValueOnce({ rows: [newOwner] });

      const res = await request(createApp())
        .post('/owners')
        .set('Cookie', authCookie())
        .send({ name: 'John Doe' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('John Doe');
    });

    it('should return 400 without name', async () => {
      const res = await request(createApp())
        .post('/owners')
        .set('Cookie', authCookie())
        .send({ important_info: 'Some info' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name required');
    });

    it('should handle communication methods', async () => {
      const newOwner = {
        id: 1,
        name: 'John Doe',
        communication_methods: [{ method: 'phone', value: '123-456' }],
      };
      query.mockResolvedValueOnce({ rows: [newOwner] });

      const res = await request(createApp())
        .post('/owners')
        .set('Cookie', authCookie())
        .send({
          name: 'John Doe',
          communication_methods: [{ method: 'phone', value: '123-456' }],
        });

      expect(res.status).toBe(201);
    });
  });

  describe('PUT /owners/:id', () => {
    it('should update existing owner', async () => {
      const updatedOwner = { id: 1, name: 'John Updated' };
      query.mockResolvedValueOnce({ rows: [updatedOwner] });

      const res = await request(createApp())
        .put('/owners/1')
        .set('Cookie', authCookie())
        .send({ name: 'John Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('John Updated');
    });

    it('should return 404 for non-existent owner', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .put('/owners/999')
        .set('Cookie', authCookie())
        .send({ name: 'Ghost Owner' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /owners/:id', () => {
    it('should delete an owner', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .delete('/owners/1')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe('POST /owners/:id/dogs/:dogId', () => {
    it('should add a dog to an owner', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .post('/owners/1/dogs/5')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('insert into dog_owners'),
        ['5', '1']
      );
    });
  });

  describe('DELETE /owners/:id/dogs/:dogId', () => {
    it('should remove a dog from an owner', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .delete('/owners/1/dogs/5')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });
});
