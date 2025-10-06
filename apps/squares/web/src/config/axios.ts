import axios from "axios";
import { User } from "oidc-client-ts";

const api = axios.create({
  baseURL: import.meta.env.PROD ? "https://squares-api.maxstash.io" : "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
	withCredentials: true,
  timeout: 10000,
});

export const setupAxiosInterceptors = (user: User | null | undefined) => {
  api.interceptors.request.use(
    config => {
      if (user?.access_token) {
        config.headers.Authorization = `Bearer ${user.access_token}`;
      }

      return config;
    },
    error => Promise.reject(error)
  );
};

export default api;
