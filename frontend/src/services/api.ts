import axios from 'axios';

// ── Safe JSON parse helper ─────────────────────────────────────────────────────
export const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value || value === 'undefined' || value === 'null') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

// ── Axios instance ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  // baseURL: 'https://task.cryptotrekkers.in/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// ── Request interceptor: attach token ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ──────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth storage helpers ───────────────────────────────────────────────────────
export const getAuthUser = <T = unknown>(): T | null =>
  safeJsonParse<T | null>(localStorage.getItem('auth_user'), null);

export const setAuthUser = (user: unknown): void =>
  localStorage.setItem('auth_user', JSON.stringify(user));

export const clearAuth = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
};

export default api;