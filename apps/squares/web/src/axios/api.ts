import axios from 'axios';
import type { User } from 'oidc-client-ts';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://squares-api.maxstash.io' : 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

export const setupAxiosInterceptors = (user: User | null | undefined) => {
  if (!user || !user.access_token) {
    return;
  }

  api.interceptors.request.clear();
  api.interceptors.request.use(
    (config) => {
      config.headers.Authorization = `Bearer ${user.access_token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );
};

export default api;
