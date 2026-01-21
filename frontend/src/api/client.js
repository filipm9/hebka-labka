const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  changePassword: (body) => request('/auth/password', { method: 'PUT', body: JSON.stringify(body) }),
  dogs: (searchOrOptions = '') => {
    const opts =
      typeof searchOrOptions === 'string'
        ? { search: searchOrOptions, tags: [], characterTags: [] }
        : (searchOrOptions || {});
    const params = new URLSearchParams();
    params.set('search', opts.search || '');
    if (Array.isArray(opts.tags) && opts.tags.length > 0) {
      params.set(
        'tags',
        opts.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .join(','),
      );
    }
    if (Array.isArray(opts.characterTags) && opts.characterTags.length > 0) {
      params.set(
        'characterTags',
        opts.characterTags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .join(','),
      );
    }
    return request(`/dogs?${params.toString()}`);
  },
  createDog: (body) => request('/dogs', { method: 'POST', body: JSON.stringify(body) }),
  updateDog: (id, body) => request(`/dogs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDog: (id) => request(`/dogs/${id}`, { method: 'DELETE' }),
  owners: (search = '') => request(`/owners?search=${encodeURIComponent(search)}`),
  createOwner: (body) => request('/owners', { method: 'POST', body: JSON.stringify(body) }),
  updateOwner: (id, body) => request(`/owners/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOwner: (id) => request(`/owners/${id}`, { method: 'DELETE' }),
  users: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  changeUserPassword: (id, body) => request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};

