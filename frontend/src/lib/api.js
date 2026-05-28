import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("zero_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// Image URLs - stored in public/images folder
export const HERO_IMG = "/images/hero.jpg";
export const TERASA_IMG = "/images/terasa.jpg";
export const RESTAURANT_IMG = "/images/restaurant.jpg";
export const DISCOTECA_IMG = "/images/discoteca.jpg";

/**
 * Resolve an image path to an absolute URL.
 * - Full URLs (http/https) are returned as-is.
 * - Paths starting with "/api/..." are prefixed with REACT_APP_BACKEND_URL so uploads served by backend load correctly.
 * - data: URIs are returned as-is.
 */
export function resolveImage(src) {
  if (!src) return "";
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) return src;
  if (src.startsWith("/")) return `${BACKEND_URL}${src}`;
  return src;
}

// Settings helpers
export async function getSettings() {
  const response = await api.get("/settings");
  return response.data;
}

export async function updateSettings(data) {
  const response = await api.put("/admin/settings", data);
  return response.data;
}
