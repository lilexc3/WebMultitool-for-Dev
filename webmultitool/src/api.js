const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const getToken = () => localStorage.getItem("access_token");
const removeToken = () => localStorage.removeItem("access_token");
const removeUserId = () => localStorage.removeItem("user_id");

function formatErrorBody(errorBody) {
  if (!errorBody || typeof errorBody !== "object") return "Request failed";
  const { detail } = errorBody;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        item && typeof item === "object" && item.msg ? item.msg : String(item),
      )
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return errorBody.message || "Request failed";
}

async function request(endpoint, options = {}) {
  const { skipAuthRedirect } = options;
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const fetchOptions = { ...options, headers };
  delete fetchOptions.skipAuthRedirect;

  const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

  if (response.status === 401 && !skipAuthRedirect) {
    removeToken();
    removeUserId();
    window.location.href = "/log-in";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(formatErrorBody(errorBody));
  }

  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// Auth (401 must not clear session / redirect — user may be on login page without token)
export const register = (email, password, name) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
    skipAuthRedirect: true,
  }).then((data) => {
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
    if (data.user_id != null) localStorage.setItem("user_id", String(data.user_id));
    return data;
  });

export const login = (email, password) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  }).then((data) => {
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
    if (data.user_id != null) localStorage.setItem("user_id", String(data.user_id));
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
  request(`/api/sites/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
export const deleteSite = (id) =>
  request(`/api/sites/${id}`, { method: "DELETE" });

/** Public check by URL (no auth) */
export const checkSiteHealthByUrl = (url) =>
  request("/api/sites/check", {
    method: "POST",
    body: JSON.stringify({ url }),
    skipAuthRedirect: true,
  });

/** Check saved site, updates last_status / last_check on server */
export const checkSiteById = (id) =>
  request(`/api/sites/${id}/check`, { method: "POST" });

export const deploySite = (id) =>
  request(`/api/sites/${id}/deploy`, { method: "POST" });
export const rollbackSite = (id) =>
  request(`/api/sites/${id}/rollback`, { method: "POST" });
export const getSiteMetrics = (id) => request(`/api/sites/${id}/metrics`);

export const getFullStats = (id) =>
  request(`/api/sites/${id}/full-stats`, { method: "POST" }).then(
    (data) => data.data,
  );

/** Site IDs with an agent WebSocket connected right now */
export const getOnlineSiteIds = () =>
  request("/api/sites/online").then((data) => data.online_sites ?? []);

export const getServerStats = () =>
  request("/api/server/stats").then((data) => data.data);

export const healthCheck = () =>
  fetch(`${API_BASE}/health`).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

export { API_BASE };
