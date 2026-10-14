import axios from 'axios';
import type { User } from 'oidc-client-ts';

export const API_BASE_URL = import.meta.env.PROD
  ? 'https://api.maxstash.io/squares'
  : 'http://localhost:8080/squares';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

// invoked when an authenticated request comes back 401
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

// drops the signed-in user's token; the gateway rejects an expired token even on public routes,
// so requests after sign-out or a 401 must go out without one
export const clearAxiosInterceptors = () => {
  api.interceptors.request.clear();
  api.interceptors.response.clear();
};

export const setupAxiosInterceptors = (user: User | null | undefined) => {
  if (!user || !user.id_token) {
    return;
  }

  // clear existing interceptors to avoid duplicates on token refresh
  clearAxiosInterceptors();

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
