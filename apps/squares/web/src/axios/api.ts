import axios from 'axios';
import type { User } from 'oidc-client-ts';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://api.maxstash.io/squares' : 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

export const setupAxiosInterceptors = (user: User | null | undefined) => {
  if (!user || !user.id_token) {
    return;
  }

  // clear existing interceptors to avoid duplicates on token refresh
  api.interceptors.request.clear();

  api.interceptors.request.use(
    (config) => {
      config.headers.Authorization = `Bearer ${user.id_token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );
};

export default api;
