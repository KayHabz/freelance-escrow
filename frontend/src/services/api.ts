import axios from "axios";

let baseURL: string;

if (process.env.NEXT_PUBLIC_API_URL) {
  baseURL = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
} else if (typeof window !== "undefined") {
  const host = window.location.host;
  const isPreview = host.endsWith(".app.github.dev");
  if (isPreview) {
    const proto = window.location.protocol;
    // Replace the frontend port (3000) with the backend port (5000)
    const backendHost = host.replace("-3000.", "-5000.");
    baseURL = `${proto}//${backendHost}/api`;
  } else {
    baseURL = "/api";
  }
} else {
  baseURL = "http://localhost:5000/api";
}

const api = axios.create({ baseURL });

export default api;