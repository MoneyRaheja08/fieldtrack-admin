// API client for the FieldTrack admin dashboard.
const BASE_URL = import.meta.env.VITE_API_URL || "https://your-backend.onrender.com";
const TOKEN_KEY = "ft_admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const detail = data?.detail;
    const err = new Error(typeof detail === "string" ? detail : detail?.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (employee_code, pin, device_id) =>
    request("/auth/login", { method: "POST", auth: false, body: { employee_code, pin, device_id } }),
  dashboard: () => request("/admin/dashboard"),
  live: () => request("/admin/live"),
  alerts: () => request("/admin/alerts"),
  report: (start, end, employee_id) =>
    request(`/admin/report?start=${start}&end=${end}${employee_id ? `&employee_id=${employee_id}` : ""}`),
  sites: () => request("/admin/sites"),
  presence: (employeeId, day) =>
    request(`/admin/presence/${employeeId}${day ? `?day=${day}` : ""}`),

  // ── Employee management ──
  employees: () => request("/admin/employees"),
  createEmployee: (emp) => request("/auth/employees", { method: "POST", body: emp }),
  deactivateEmployee: (id) => request(`/admin/employees/${id}/deactivate`, { method: "PATCH" }),
  activateEmployee: (id) => request(`/admin/employees/${id}/activate`, { method: "PATCH" }),
  deleteEmployee: (id) => request(`/admin/employees/${id}`, { method: "DELETE" }),
  setHourlyRate: (id, rate) => request(`/admin/employees/${id}/rate`, { method: "PATCH", body: { hourly_rate: rate } }),
  forceClockOut: (id) => request(`/admin/attendance/${id}/force-clockout`, { method: "POST" }),
  payroll: (start, end) => request(`/admin/payroll?start=${start}&end=${end}`),
  resetDevice: (id) => request(`/auth/reset-device/${id}`, { method: "POST" }),
  createSite: (site) => request("/admin/sites", { method: "POST", body: site }),
  deleteSite: (id) => request(`/admin/sites/${id}`, { method: "DELETE" }),
  resetDevice: (id) => request(`/auth/reset-device/${id}`, { method: "POST" }),
  // CSV export uses a direct link with the token as a query-less fetch + blob
  exportCsv: async (start, end) => {
    const res = await fetch(`${BASE_URL}/admin/report/export?start=${start}&end=${end}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  },
};
