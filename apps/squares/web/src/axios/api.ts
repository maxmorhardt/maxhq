import axios from "axios";
import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

const api = axios.create({
  baseURL: import.meta.env.PROD ? "https://squares-api.maxstash.io" : "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000,
});

export const setupAxiosInterceptors = (auth: ReturnType<typeof useAuth>) => {
  api.interceptors.request.use(
    (config) => {
      if (auth.user?.access_token) {
        config.headers.Authorization = `Bearer ${auth.user.access_token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (auth.isAuthenticated) {
          try {
            const refreshedUser = await auth.signinSilent?.();
            if (refreshedUser?.access_token) {
              originalRequest.headers.Authorization = `Bearer ${refreshedUser.access_token}`;
              return api(originalRequest);
            }
          } catch {
            auth.signinRedirect();
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

export const useAxiosAuth = () => {
  const auth = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) {
      setupAxiosInterceptors(auth);
      setReady(true);
    }
  }, [auth, ready]);

  return ready;
};

export default api;
