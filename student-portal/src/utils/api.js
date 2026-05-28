import axios from 'axios';

const api = axios.create({
  baseURL: '/api/student',
});

// Attach token from context — call setStudentToken() to update
let _token = null;
export function setStudentToken(t) { _token = t; }

api.interceptors.request.use(config => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err.response?.data || err)
);

export default api;
