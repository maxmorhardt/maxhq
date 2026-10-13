import axios from 'axios';
import type { User } from 'oidc-client-ts';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://api.maxstash.io/squares' : 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

// invoked when an authenticated request comes back 401
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export const setupAxiosInterceptors = (user: User | null | undefined) => {
  if (!user || !user.id_token) {
    return;
  }

  // clear existing interceptors to avoid duplicates on token refresh
  api.interceptors.request.clear();
  api.interceptors.response.clear();

  api.interceptors.request.use(
    (config) => {
      config.headers.Authorization = `Bearer ${user.id_token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );
};

export default api;
