/**
 * Thin API client — all requests go through here so auth headers
 * are attached consistently and 401s are handled globally.
 */

const BASE = '/api';

function getToken() {
  return localStorage.getItem('tidds_token');
}

async function request(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: opts.isFormData ? { Authorization: headers['Authorization'] } : headers,
    body: opts.isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('tidds_token');
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  postForm: (path, formData) => request('POST', path, formData, { isFormData: true }),
};
