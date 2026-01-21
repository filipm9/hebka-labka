import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './client.js';

describe('API Client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request basics', () => {
    it('should make requests with correct options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      await api.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(api.me()).rejects.toThrow('Unauthorized');
    });

    it('should throw generic error when response has no error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(api.me()).rejects.toThrow('Request failed');
    });

    it('should handle JSON parse failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(api.me()).rejects.toThrow('Request failed');
    });
  });

  describe('auth endpoints', () => {
    it('should POST to login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.login({ email: 'test@test.com', password: 'pass' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'pass' }),
        })
      );
    });

    it('should POST to logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should PUT to change password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.changePassword({ currentPassword: 'old', newPassword: 'new' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/password'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('dogs endpoints', () => {
    it('should handle string search parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.dogs('buddy');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dogs?search=buddy'),
        expect.any(Object)
      );
    });

    it('should handle empty search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.dogs('');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dogs?search='),
        expect.any(Object)
      );
    });

    it('should handle object with tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.dogs({ search: 'test', tags: ['friendly', 'calm'] });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('search=test');
      expect(url).toContain('tags=friendly%2Ccalm');
    });

    it('should handle object with character tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.dogs({ search: '', characterTags: ['playful', 'shy'] });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('characterTags=playful%2Cshy');
    });

    it('should filter empty tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.dogs({ search: '', tags: ['friendly', '', '  '] });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('tags=friendly');
    });

    it('should POST to create dog', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Buddy' }),
      });

      await api.createDog({ name: 'Buddy' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dogs'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Buddy' }),
        })
      );
    });

    it('should PUT to update dog', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'Buddy Updated' }),
      });

      await api.updateDog(1, { name: 'Buddy Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dogs/1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should DELETE to remove dog', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.deleteDog(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/dogs/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('owners endpoints', () => {
    it('should handle string search parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.owners('john');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/owners?search=john'),
        expect.any(Object)
      );
    });

    it('should handle object with breed filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.owners({ search: '', breed: 'labrador' });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('breed=labrador');
    });

    it('should handle object with contact tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.owners({ search: '', contactTags: ['phone', 'email'] });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('contactTags=phone%2Cemail');
    });

    it('should POST to create owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John' }),
      });

      await api.createOwner({ name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/owners'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should PUT to update owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, name: 'John Updated' }),
      });

      await api.updateOwner(1, { name: 'John Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/owners/1'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should DELETE to remove owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.deleteOwner(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/owners/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should POST to add dog to owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.addDogToOwner(1, 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/owners/1/dogs/5'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should DELETE to remove dog from owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.removeDogFromOwner(1, 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/owners/1/dogs/5'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('users endpoints', () => {
    it('should GET users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await api.users();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.any(Object)
      );
    });

    it('should POST to create user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      });

      await api.createUser({ email: 'new@test.com', password: 'pass' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should PUT to change user password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.changeUserPassword(1, { password: 'newpass' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/password'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('should DELETE user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      await api.deleteUser(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('config endpoints', () => {
    it('should GET all config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ key: 'value' }),
      });

      await api.getConfig();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/config'),
        expect.any(Object)
      );
    });

    it('should GET specific config key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(['value1', 'value2']),
      });

      await api.getConfigKey('myKey');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/myKey'),
        expect.any(Object)
      );
    });

    it('should PUT to set config key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(['newValue']),
      });

      await api.setConfigKey('myKey', ['newValue']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/config/myKey'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ value: ['newValue'] }),
        })
      );
    });
  });
});
