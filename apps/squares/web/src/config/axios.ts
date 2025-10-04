import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.PROD ? "https://sqaures-api.maxstash.io" : "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

export default api;
