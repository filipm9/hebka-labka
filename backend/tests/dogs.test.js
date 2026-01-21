import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { dogsRouter } from '../src/routes/dogs.js';
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
  app.use('/dogs', dogsRouter);
  return app;
}

function authCookie() {
  const token = jwt.sign({ id: 1, email: 'test@test.com' }, 'test-secret');
  return `session=${token}`;
}

describe('Dogs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /dogs', () => {
    it('should return dogs list', async () => {
      const mockDogs = [
        { id: 1, name: 'Buddy', breed: 'Labrador', owners: [] },
        { id: 2, name: 'Max', breed: 'Beagle', owners: [] },
      ];
      query.mockResolvedValueOnce({ rows: mockDogs });

      const res = await request(createApp())
        .get('/dogs')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Buddy');
    });

    it('should filter by search term', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Buddy' }] });

      await request(createApp())
        .get('/dogs?search=buddy')
        .set('Cookie', authCookie());

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('where'),
        expect.arrayContaining(['buddy', '%buddy%'])
      );
    });

    it('should filter by tags', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await request(createApp())
        .get('/dogs?tags=friendly,calm')
        .set('Cookie', authCookie());

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([['friendly', 'calm']])
      );
    });

    it('should return 401 without auth', async () => {
      const res = await request(createApp()).get('/dogs');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /dogs/:id', () => {
    it('should return a single dog', async () => {
      const mockDog = { id: 1, name: 'Buddy', owners: [] };
      query.mockResolvedValueOnce({ rows: [mockDog] });

      const res = await request(createApp())
        .get('/dogs/1')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Buddy');
    });

    it('should return 404 for non-existent dog', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .get('/dogs/999')
        .set('Cookie', authCookie());

      expect(res.status).toBe(404);
    });
  });

  describe('POST /dogs', () => {
    it('should create a dog with valid data', async () => {
      const newDog = { id: 1, name: 'Buddy', breed: 'Labrador' };
      query
        .mockResolvedValueOnce({ rows: [newDog] }) // insert
        .mockResolvedValueOnce({ rows: [{ ...newDog, owners: [] }] }); // fetch with owners

      const res = await request(createApp())
        .post('/dogs')
        .set('Cookie', authCookie())
        .send({ name: 'Buddy', breed: 'Labrador' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Buddy');
    });

    it('should return 400 without name', async () => {
      const res = await request(createApp())
        .post('/dogs')
        .set('Cookie', authCookie())
        .send({ breed: 'Labrador' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('name required');
    });

    it('should handle owner associations', async () => {
      const newDog = { id: 1, name: 'Buddy' };
      query
        .mockResolvedValueOnce({ rows: [newDog] }) // insert dog
        .mockResolvedValueOnce({ rows: [] }) // insert dog_owners
        .mockResolvedValueOnce({ rows: [{ ...newDog, owners: [{ id: 5, name: 'John' }] }] });

      const res = await request(createApp())
        .post('/dogs')
        .set('Cookie', authCookie())
        .send({ name: 'Buddy', owner_ids: [5] });

      expect(res.status).toBe(201);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('insert into dog_owners'),
        expect.arrayContaining([1, 5])
      );
    });

    it('should handle grooming tolerance tags', async () => {
      const newDog = { id: 1, name: 'Buddy', grooming_tolerance: ['nail_trim', 'bath'] };
      query
        .mockResolvedValueOnce({ rows: [newDog] })
        .mockResolvedValueOnce({ rows: [{ ...newDog, owners: [] }] });

      const res = await request(createApp())
        .post('/dogs')
        .set('Cookie', authCookie())
        .send({ name: 'Buddy', grooming_tolerance: ['nail_trim', 'bath'] });

      expect(res.status).toBe(201);
    });
  });

  describe('PUT /dogs/:id', () => {
    it('should update existing dog', async () => {
      const updatedDog = { id: 1, name: 'Buddy Updated' };
      query
        .mockResolvedValueOnce({ rows: [updatedDog] }) // update
        .mockResolvedValueOnce({ rows: [] }) // delete old owners
        .mockResolvedValueOnce({ rows: [{ ...updatedDog, owners: [] }] });

      const res = await request(createApp())
        .put('/dogs/1')
        .set('Cookie', authCookie())
        .send({ name: 'Buddy Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Buddy Updated');
    });

    it('should return 404 for non-existent dog', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .put('/dogs/999')
        .set('Cookie', authCookie())
        .send({ name: 'Ghost Dog' });

      expect(res.status).toBe(404);
    });

    it('should update owner associations', async () => {
      const dog = { id: 1, name: 'Buddy' };
      query
        .mockResolvedValueOnce({ rows: [dog] })
        .mockResolvedValueOnce({ rows: [] }) // delete old
        .mockResolvedValueOnce({ rows: [] }) // insert new
        .mockResolvedValueOnce({ rows: [{ ...dog, owners: [{ id: 10, name: 'Jane' }] }] });

      await request(createApp())
        .put('/dogs/1')
        .set('Cookie', authCookie())
        .send({ name: 'Buddy', owner_ids: [10] });

      expect(query).toHaveBeenCalledWith(
        'delete from dog_owners where dog_id = $1',
        [1]
      );
    });
  });

  describe('DELETE /dogs/:id', () => {
    it('should delete a dog', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(createApp())
        .delete('/dogs/1')
        .set('Cookie', authCookie());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });
});
