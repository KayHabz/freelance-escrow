import axios from "axios";

let baseURL: string;

if (process.env.NEXT_PUBLIC_API_URL) {
  baseURL = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
} else if (typeof window !== "undefined") {
  const host = window.location.host;
  const isPreview = host.endsWith(".app.github.dev");
  if (isPreview) {
    const proto = window.location.protocol;
    const backendHost = host.replace("-3000.", "-5000.");
    baseURL = `${proto}//${backendHost}/api`;
  } else {
    baseURL = "/api";
  }
} else {
  baseURL = "http://localhost:5000/api";
}

const api = axios.create({ baseURL });

// ✅ Attach JWT token — but don't overwrite if already set (e.g. adminToken)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined" && !config.headers.Authorization) {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Auto-redirect to login if token expires
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;