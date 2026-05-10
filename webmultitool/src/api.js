const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getToken = () => localStorage.getItem("access_token");
const setToken = (token) => localStorage.setItem("access_token", token);
const removeToken = () => localStorage.removeItem("access_token");
const setUserId = (id) => localStorage.setItem("user_id", id);
const removeUserId = () => localStorage.removeItem("user_id");

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (response.status === 401) {
    removeToken();
    removeUserId();
    window.location.href = "/log-in";
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// Auth
export const register = (email, password, name) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  }).then((data) => {
    if (data.access_token) setToken(data.access_token);
    if (data.user_id) setUserId(data.user_id);
    return data;
  });

export const login = (email, password) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then((data) => {
    if (data.access_token) setToken(data.access_token);
    if (data.user_id) setUserId(data.user_id);
    return data;
  });

export const logout = () => {
  removeToken();
  removeUserId();
  window.location.href = "/log-in";
};

// Sites
export const getSites = () => request("/api/sites").then((data) => data.data);
export const getSite = (id) =>
  request(`/api/sites/${id}`).then((data) => data.data);
export const createSite = (siteData) =>
  request("/api/sites", { method: "POST", body: JSON.stringify(siteData) });
export const updateSite = (id, updates) =>
  request(`/api/sites/${id}`, { method: "PUT", body: JSON.stringify(updates) });
export const deleteSite = (id) =>
  request(`/api/sites/${id}`, { method: "DELETE" });
export const deploySite = (id) =>
  request(`/api/sites/${id}/deploy`, { method: "POST" });
export const rollbackSite = (id) =>
  request(`/api/sites/${id}/rollback`, { method: "POST" });
export const getSiteMetrics = (id) => request(`/api/sites/${id}/metrics`);
export const getFullStats = (id) =>
  request(`/api/sites/${id}/full-stats`, { method: "POST" }).then(
    (data) => data.data,
  );
export const getServerStats = () =>
  request("/api/server/stats").then((data) => data.data);
export const healthCheck = () =>
  fetch(`${API_BASE}/health`).then((res) => res.json());
