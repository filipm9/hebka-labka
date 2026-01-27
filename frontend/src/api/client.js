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

/**
 * Download a file from the API
 */
async function downloadFile(path, defaultFilename) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Download failed');
  }

  // Get filename from Content-Disposition header if available
  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return { filename, size: blob.size };
}

/**
 * Upload audio file for transcription
 * Returns { raw: string, text: string } where raw is Whisper output and text is GPT-cleaned
 */
async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Transcription failed');
  }

  const data = await res.json();
  return { raw: data.raw, text: data.text };
}

export const api = {
  transcribeAudio,
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
  owners: (searchOrOptions = '') => {
    const opts =
      typeof searchOrOptions === 'string'
        ? { search: searchOrOptions, breed: '', contactTags: [] }
        : (searchOrOptions || {});
    const params = new URLSearchParams();
    params.set('search', opts.search || '');
    if (opts.breed) {
      params.set('breed', opts.breed);
    }
    if (Array.isArray(opts.contactTags) && opts.contactTags.length > 0) {
      params.set(
        'contactTags',
        opts.contactTags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .join(','),
      );
    }
    return request(`/owners?${params.toString()}`);
  },
  createOwner: (body) => request('/owners', { method: 'POST', body: JSON.stringify(body) }),
  updateOwner: (id, body) => request(`/owners/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOwner: (id) => request(`/owners/${id}`, { method: 'DELETE' }),
  addDogToOwner: (ownerId, dogId) => request(`/owners/${ownerId}/dogs/${dogId}`, { method: 'POST' }),
  removeDogFromOwner: (ownerId, dogId) => request(`/owners/${ownerId}/dogs/${dogId}`, { method: 'DELETE' }),
  users: () => request('/users'),
  createUser: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  changeUserPassword: (id, body) => request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  // Config endpoints (replaces localStorage)
  getConfig: () => request('/config'),
  getConfigKey: (key) => request(`/config/${key}`),
  setConfigKey: (key, value) => request(`/config/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  // Backup endpoints
  backupStatus: () => request('/backup/status'),
  downloadBackupSql: () => downloadFile('/backup/sql', 'backup.sql'),
  downloadBackupJson: () => downloadFile('/backup/json', 'backup.json'),
  sendBackupEmail: () => request('/backup/send-email', { method: 'POST' }),
};

