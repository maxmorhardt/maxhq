// src/config/axiosAuth.ts
import api from "./axios";
import type { User } from "oidc-client-ts";

export const attachAuthInterceptor = (user?: User | null) => {
  api.interceptors.request.clear();

  api.interceptors.request.use((config) => {
    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  });

  return api;
};
