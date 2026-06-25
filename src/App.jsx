// FieldTrack Admin - main dashboard, wired to the live backend.
import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Users, Clock, AlertTriangle, ShieldAlert,
  Download, LogOut, RefreshCw, Trash2, Plus, Activity, UserPlus, Smartphone,
} from "lucide-react";
import { api, clearToken, getToken } from "./services/api";
import { C, fmt, fmtDur, friendlyFlag, Card, Tag, inp } from "./components/ui";
import LiveMap from "./components/LiveMap";
import Login from "./components/Login";

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export default function App() {
  const [employee, setEmployee] = useState(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState("overview");

  const [dash, setDash] = useState(null);
  const [live, setLive] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [report, setReport] = useState([]);
  const [sites, setSites] = useState([]);
  const [range, setRange] = useState({ start: daysAgo(7), end: todayStr() });
  const [newSite, setNewSite] = useState({ name: "", latitude: "", longitude: "", radius_m: "150" });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [presenceFor, setPresenceFor] = useState(null); // {id, data}
  const [employees, setEmployees] = useState([]);
  const [newEmp, setNewEmp] = useState({ name: "", employee_code: "", pin: "", job_title: "" });
  const [empMsg, setEmpMsg] = useState("");

  async function loadEmployees() {
    try {
      setEmployees(await api.employees());
    } catch (e) {
      setError("Could not load employees: " + e.message);
    }
  }

  async function addEmployee() {
    setEmpMsg("");
    if (!newEmp.name.trim() || !newEmp.employee_code.trim() || newEmp.pin.length < 4) {
      setEmpMsg("Name, code, and a 4-6 digit PIN are required.");
      return;
    }
    try {
      const body = {
        name: newEmp.name.trim(),
        employee_code: newEmp.employee_code.trim().toUpperCase(),
        pin: newEmp.pin,
        role: "employee",
      };
      if (newEmp.job_title.trim()) body.job_title = newEmp.job_title.trim();
      await api.createEmployee(body);
      setNewEmp({ name: "", employee_code: "", pin: "", job_title: "" });
      setEmpMsg("✓ Employee added");
      loadEmployees();
    } catch (e) {
      setEmpMsg("✗ " + e.message);
    }
  }

  async function toggleEmployee(emp) {
    try {
      if (emp.active) await api.deactivateEmployee(emp.id);
      else await api.activateEmployee(emp.id);
      loadEmployees();
    } catch (e) {
      setError(e.message);
    }
  }

  async function resetDevice(id) {
    try {
      await api.resetDevice(id);
      setEmpMsg("✓ Device reset — they can log in on a new phone");
      loadEmployees();
    } catch (e) {
      setError(e.message);
    }
  }

  async function viewPresence(empId, empName) {
    try {
      const data = await api.presence(empId);
      setPresenceFor({ id: empId, name: empName, data });
    } catch (e) {
      setError("Could not load presence: " + e.message);
    }
  }

  // Restore session if a token exists
  useEffect(() => {
    if (getToken()) {
      // Token present; verify by hitting dashboard. If it fails, log out.
      api.dashboard()
        .then(() => setEmployee({ role: "admin", name: "Admin" }))
        .catch(() => clearToken())
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [d, l, a, s] = await Promise.all([
        api.dashboard(), api.live(), api.alerts(), api.sites(),
      ]);
      setDash(d); setLive(l); setAlerts(a); setSites(s);
      setReport(await api.report(range.start, range.end));
    } catch (e) {
      setError(e.message || "Failed to load data");
      if (e.status === 401) handleLogout();
    } finally {
      setRefreshing(false);
    }
  }, [range.start, range.end]);

  useEffect(() => { if (employee) loadAll(); }, [employee, loadAll]);

  // Load employees when the Employees tab opens
  useEffect(() => {
    if (employee && tab === "employees") loadEmployees();
  }, [employee, tab]);

  // Auto-refresh live locations every 10s on the overview tab
  useEffect(() => {
    if (!employee || tab !== "overview") return;
    const id = setInterval(() => {
      api.live().then(setLive).catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, [employee, tab]);

  function handleLogout() {
    clearToken();
    setEmployee(null);
  }

  async function exportCsv() {
    try {
      const blob = await api.exportCsv(range.start, range.end);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${range.start}_${range.end}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export failed: " + e.message);
    }
  }

  async function addSite() {
    if (!newSite.name || !newSite.latitude || !newSite.longitude) return;
    try {
      await api.createSite({
        name: newSite.name,
        latitude: +newSite.latitude,
        longitude: +newSite.longitude,
        radius_m: +newSite.radius_m || 150,
      });
      setNewSite({ name: "", latitude: "", longitude: "", radius_m: "150" });
      setSites(await api.sites());
    } catch (e) {
      setError("Could not add site: " + e.message);
    }
  }

  async function removeSite(id) {
    try {
      await api.deleteSite(id);
      setSites(sites.filter((s) => s.id !== id));
    } catch (e) {
      setError("Could not delete site: " + e.message);
    }
  }

  if (booting)
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RefreshCw size={28} color={C.accent} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (!employee) return <Login onAuthed={setEmployee} />;

  const tabs = [
    { id: "overview", label: "Live Map", icon: MapPin },
    { id: "logs", label: "Attendance", icon: Clock },
    { id: "employees", label: "Employees", icon: Users },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "sites", label: "Job Sites", icon: Activity },
  ];

  const stats = [
    { label: "Active Now", value: dash?.active_now, color: C.green, icon: Users },
    { label: "Present", value: dash?.present_today, color: C.accent, icon: Clock },
    { label: "Absent", value: dash?.absent_today, color: C.red, icon: Users },
    { label: "Late", value: dash?.late_today, color: C.amber, icon: Clock },
    { label: "Flagged", value: dash?.flagged_today, color: C.amber, icon: AlertTriangle },
    { label: "Blocked", value: dash?.blocked_attempts_today, color: C.red, icon: ShieldAlert },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, system-ui, sans-serif", padding: "20px 16px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={24} color={C.accent} />
            <div>
              <h1 style={{ color: C.text, fontSize: 20, margin: 0 }}>FieldTrack Admin</h1>
              <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{dash?.date} · {dash?.active_now ?? 0} active in field</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={loadAll} style={btnSecondary}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
            <button onClick={handleLogout} style={btnSecondary}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 18 }}>
          {stats.map((s) => (
            <Card key={s.label} style={{ padding: 14, textAlign: "center" }}>
              <s.icon size={16} color={s.color} style={{ marginBottom: 4 }} />
              <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value ?? "—"}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 12, padding: 4, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.id ? C.card : "transparent", color: tab === t.id ? C.text : C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <h3 style={h3}>Live Field Locations</h3>
              <LiveMap live={live} sites={sites} />
              <p style={{ color: C.muted, fontSize: 12, marginTop: 8, textAlign: "center" }}>Green rings are job-site geofences · updates every 10s · amber = flagged punch</p>
            </Card>
            <Card>
              <h3 style={h3}>Currently Clocked In ({live.length})</h3>
              {live.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>Nobody is clocked in right now.</p>}
              {live.map((p) => (
                <div key={p.employee_id}>
                  <div style={rowStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={avatar}>{p.employee_name.split(" ").map((n) => n[0]).join("")}</div>
                      <div>
                        <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{p.employee_name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>In at {fmt(p.clock_in)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => viewPresence(p.employee_id, p.employee_name)}
                        style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12 }}>
                        Time away
                      </button>
                      {p.flags?.length > 0
                        ? <Tag color={C.amber}>⚠ {friendlyFlag(p.flags[0])}</Tag>
                        : <Tag color={C.green}>● Active</Tag>}
                    </div>
                  </div>
                  {presenceFor?.id === p.employee_id && (
                    <div style={{ background: C.surface, borderRadius: 8, padding: 12, margin: "4px 0 10px", border: `1px solid ${C.border}` }}>
                      {presenceFor.data.away_segments?.length === 0 && !presenceFor.data.still_away
                        ? <div style={{ color: C.green, fontSize: 13 }}>On site the whole time — no gaps.</div>
                        : <>
                            {presenceFor.data.away_segments?.map((s, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.text, paddingVertical: 3 }}>
                                <span>{fmt(s.left_at)} → {fmt(s.returned_at)}</span>
                                <span style={{ color: C.muted }}>{s.minutes} min away</span>
                              </div>
                            ))}
                            {presenceFor.data.still_away && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.amber, paddingVertical: 3 }}>
                                <span>Left {fmt(presenceFor.data.still_away.left_at)} · not back</span>
                                <span>{presenceFor.data.still_away.minutes} min</span>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: C.text, paddingTop: 6, marginTop: 4, borderTop: `1px solid ${C.border}` }}>
                              <span>Total away</span><span>{presenceFor.data.total_away_minutes} min</span>
                            </div>
                            {presenceFor.data.net_worked_minutes != null && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, paddingTop: 3 }}>
                                <span>Net worked</span><span>{fmtDur(presenceFor.data.net_worked_minutes)}</span>
                              </div>
                            )}
                          </>}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* LOGS */}
        {tab === "logs" && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ ...h3, margin: 0 }}>Attendance Records</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} style={dateInp} />
                <span style={{ color: C.muted }}>→</span>
                <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} style={dateInp} />
                <button onClick={loadAll} style={{ ...btnSecondary, padding: "7px 12px" }}>Apply</button>
                <button onClick={exportCsv} style={btnPrimary}>
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>
            {report.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No records in this range.</p>}
            {report.map((r) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1.5fr", gap: 8, padding: "11px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, alignItems: "center" }}>
                <div style={{ color: C.text, fontWeight: 600 }}>{r.employee_name}</div>
                <div style={{ color: C.muted }}>{new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
                <div style={{ color: C.text }}>{fmt(r.clock_in)} → {fmt(r.clock_out)}</div>
                <div style={{ color: C.muted }}>{fmtDur(r.duration_minutes)}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Tag color={r.is_late ? C.amber : C.green}>{r.is_late ? "Late" : "On Time"}</Tag>
                  {r.flags?.length > 0 && <Tag color={C.red}>⚠</Tag>}
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* ALERTS */}
        {tab === "alerts" && alerts && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alerts.blocked_attempts?.length > 0 && (
              <Card>
                <h3 style={{ ...h3, color: C.red, display: "flex", alignItems: "center", gap: 8 }}><ShieldAlert size={17} /> Blocked Fraud Attempts ({alerts.blocked_attempts.length})</h3>
                {alerts.blocked_attempts.map((b, i) => (
                  <div key={i} style={rowStyle}>
                    <span style={{ color: C.text, fontSize: 14 }}>{b.name} <span style={{ color: C.muted }}>· {fmt(b.at)}</span></span>
                    <Tag color={C.red}>{friendlyFlag(b.reason)}</Tag>
                  </div>
                ))}
              </Card>
            )}
            {alerts.flagged?.length > 0 && (
              <Card>
                <h3 style={{ ...h3, color: C.amber, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={17} /> Flagged Punches ({alerts.flagged.length})</h3>
                {alerts.flagged.map((f, i) => (
                  <div key={i} style={rowStyle}>
                    <span style={{ color: C.text, fontSize: 14 }}>{f.name}</span>
                    <Tag color={C.amber}>{friendlyFlag(f.flags[0])}</Tag>
                  </div>
                ))}
              </Card>
            )}
            {alerts.absent?.length > 0 && (
              <Card>
                <h3 style={{ ...h3, color: C.red }}>Absent Today ({alerts.absent.length})</h3>
                {alerts.absent.map((a) => (
                  <div key={a.id} style={rowStyle}>
                    <span style={{ color: C.text, fontSize: 14 }}>{a.name} <span style={{ color: C.muted }}>· {a.code}</span></span>
                    <Tag color={C.red}>No clock-in</Tag>
                  </div>
                ))}
              </Card>
            )}
            {alerts.late?.length > 0 && (
              <Card>
                <h3 style={{ ...h3, color: C.amber }}>Late Arrivals ({alerts.late.length})</h3>
                {alerts.late.map((l, i) => (
                  <div key={i} style={rowStyle}>
                    <span style={{ color: C.text, fontSize: 14 }}>{l.name}</span>
                    <Tag color={C.amber}>In at {fmt(l.clock_in)}</Tag>
                  </div>
                ))}
              </Card>
            )}
            {!alerts.blocked_attempts?.length && !alerts.flagged?.length && !alerts.absent?.length && !alerts.late?.length && (
              <Card style={{ textAlign: "center", padding: 40 }}>
                <p style={{ color: C.muted }}>🎉 No alerts. Everyone is on time and verified.</p>
              </Card>
            )}
          </div>
        )}

        {/* EMPLOYEES */}
        {tab === "employees" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={{ ...h3, display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={17} /> Add Employee
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input placeholder="Full name" value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })} style={inp} />
                <input placeholder="Code (e.g. E001)" value={newEmp.employee_code}
                  onChange={(e) => setNewEmp({ ...newEmp, employee_code: e.target.value })} style={inp} />
                <input placeholder="Job title" value={newEmp.job_title}
                  onChange={(e) => setNewEmp({ ...newEmp, job_title: e.target.value })} style={inp} />
                <input placeholder="PIN (4-6 digits)" value={newEmp.pin}
                  onChange={(e) => setNewEmp({ ...newEmp, pin: e.target.value.replace(/\D/g, "") })}
                  maxLength={6} style={inp} />
                <button onClick={addEmployee} style={{ ...btnPrimary, padding: "9px 12px" }}>
                  <Plus size={15} /> Add
                </button>
              </div>
              {empMsg && (
                <p style={{ fontSize: 13, marginTop: 10, color: empMsg.startsWith("✓") ? C.green : C.red }}>{empMsg}</p>
              )}
              <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                The employee logs into the phone app with their code + PIN. Their phone binds on first login.
              </p>
            </Card>

            <Card>
              <h3 style={h3}>All Employees ({employees.length})</h3>
              {employees.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No employees yet. Add your first one above.</p>}
              {employees.map((e) => (
                <div key={e.id} style={rowStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ ...avatar, opacity: e.active ? 1 : 0.4 }}>
                      {e.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>
                        {e.name}
                        {e.role === "admin" && <span style={{ ...tagInline, background: C.accentLo, color: C.accent }}>admin</span>}
                        {!e.active && <span style={{ ...tagInline, background: C.red + "22", color: C.red }}>inactive</span>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {e.employee_code}{e.job_title ? ` · ${e.job_title}` : ""}
                        {e.has_device && <span style={{ color: C.green }}> · 📱 device bound</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {e.has_device && (
                      <button onClick={() => resetDevice(e.id)} title="Let them switch phones"
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12, gap: 4 }}>
                        <Smartphone size={13} /> Reset
                      </button>
                    )}
                    {e.role !== "admin" && (
                      <button onClick={() => toggleEmployee(e)}
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12, color: e.active ? C.red : C.green }}>
                        {e.active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* SITES */}
        {tab === "sites" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Add Job Site (Geofence)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input placeholder="Site name" value={newSite.name} onChange={(e) => setNewSite({ ...newSite, name: e.target.value })} style={inp} />
                <input placeholder="Latitude" value={newSite.latitude} onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value })} style={inp} />
                <input placeholder="Longitude" value={newSite.longitude} onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value })} style={inp} />
                <input placeholder="Radius m" value={newSite.radius_m} onChange={(e) => setNewSite({ ...newSite, radius_m: e.target.value })} style={inp} />
                <button onClick={addSite} style={{ ...btnPrimary, padding: "9px 12px" }}><Plus size={15} /></button>
              </div>
              <p style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>Tip: get coordinates by right-clicking a spot in Google Maps.</p>
            </Card>
            <Card>
              <h3 style={h3}>Configured Sites ({sites.length})</h3>
              {sites.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No sites yet. Add one above — punches outside every site get blocked.</p>}
              {sites.map((s) => (
                <div key={s.id} style={rowStyle}>
                  <div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)} · {s.radius_m}m radius</div>
                  </div>
                  <button onClick={() => removeSite(s.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.red }}><Trash2 size={16} /></button>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} input::placeholder{color:${C.muted}} input[type=date]{color-scheme:dark}`}</style>
    </div>
  );
}

const h3 = { color: C.text, fontSize: 15, margin: "0 0 12px" };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}` };
const avatar = { width: 36, height: 36, borderRadius: "50%", background: C.accentLo, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 };
const btnSecondary = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 };
const btnPrimary = { background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
const dateInp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontSize: 12 };
const tagInline = { fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", marginLeft: 8 };
