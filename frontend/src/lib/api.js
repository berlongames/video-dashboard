const API = (import.meta.env.VITE_API_BASE || "") + "/api";

function authHeaders() {
  const user = localStorage.getItem("vd_user") || "admin";
  const pass = localStorage.getItem("vd_pass") || "";
  if (!pass) return {};
  return {
    Authorization: "Basic " + btoa(`${user}:${pass}`),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request("/health"),
  me: () => request("/auth/me"),

  listJobs: (status) => request(`/jobs${status ? `?status=${status}` : ""}`),
  getJob: (id) => request(`/jobs/${id}`),
  createJob: (formData) =>
    request("/jobs", { method: "POST", body: formData }),
  createJobJson: (body) =>
    request("/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  retryJob: (id) => request(`/jobs/${id}/retry`, { method: "POST" }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),

  listSchedules: (status) =>
    request(`/schedules${status ? `?status=${status}` : ""}`),
  updateSchedule: (id, body) =>
    request(`/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  uploadNow: (id) =>
    request(`/schedules/${id}/upload-now`, { method: "POST" }),

  statsSummary: () => request("/stats/summary"),
  videoStats: (ytId) => request(`/stats/video/${ytId}`),

  saveAiConnector: (body) =>
    request("/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  getAiConnector: () => request("/settings/ai"),

  scanTitle: (body) =>
    request("/ai/scan-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};

export function setCredentials(user, pass) {
  localStorage.setItem("vd_user", user);
  localStorage.setItem("vd_pass", pass);
}
