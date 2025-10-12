import axios from 'axios';
import type { User } from 'oidc-client-ts';
import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://squares-api.maxstash.io' : 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

export const setupAxiosInterceptors = (user: User | null | undefined) => {
  api.interceptors.request.clear();

  api.interceptors.request.use(
    (config) => {
      if (user?.access_token) {
        config.headers.Authorization = `Bearer ${user.access_token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
};

export const useAxiosAuth = () => {
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setupAxiosInterceptors(auth.user);
    setReady(Boolean(auth.isAuthenticated && auth.user?.access_token));
  }, [auth.user, auth.isAuthenticated]);

  return ready && !auth.isLoading;
};

export default api;
