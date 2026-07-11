// FieldTrack Admin - main dashboard, wired to the live backend.
import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Users, Clock, AlertTriangle, ShieldAlert,
  Download, LogOut, RefreshCw, Trash2, Plus, Activity, UserPlus, Smartphone, Navigation,
} from "lucide-react";
import { api, clearToken, getToken } from "./services/api";
import { C, fmt, fmtDur, friendlyFlag, Card, Tag, inp } from "./components/ui";
import LiveMap from "./components/LiveMap";
import RadiusMap from "./components/RadiusMap";
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
  const [newEmp, setNewEmp] = useState({ name: "", employee_code: "", pin: "", job_title: "", phone: "" });
  const [waLink, setWaLink] = useState(null);
  const [empMsg, setEmpMsg] = useState("");
  const [tileView, setTileView] = useState(null); // {key, label, color, list}
  const [payrollData, setPayrollData] = useState(null);
  const [payRange, setPayRange] = useState({ start: "", end: "" });
  const [empFilter, setEmpFilter] = useState("all");
  const [editEmp, setEditEmp] = useState(null);
  const [selfieView, setSelfieView] = useState(null);   // {loading, image}
  const [editRec, setEditRec] = useState(null);          // record being time-corrected

  async function loadEmployees() {
    try {
      setEmployees(await api.employees());
    } catch (e) {
      setError("Could not load employees: " + e.message);
    }
  }

  // Where employees get the app / clock-in. Edit these two to your links.
  const APP_DOWNLOAD_LINK = "ASK_ADMIN_FOR_APK";   // paste your APK link here
  const WEB_CLOCKIN_LINK = "https://fieldtrack-admin-theta.vercel.app"; // or your web clock-in URL

  function whatsappCredentialLink(emp) {
    const phone = (emp.phone || "").replace(/\D/g, "");
    if (!phone) return null;
    const withCountry = phone.length === 10 ? "91" + phone : phone;
    const msg =
      `Welcome to FieldTrack, ${emp.name}! 👋\n\n` +
      `Your attendance login:\n` +
      `🆔 Code: ${emp.employee_code}\n` +
      `🔑 PIN: ${emp.pin}\n\n` +
      (APP_DOWNLOAD_LINK !== "ASK_ADMIN_FOR_APK" ? `📲 App: ${APP_DOWNLOAD_LINK}\n` : "") +
      `🌐 Web clock-in: ${WEB_CLOCKIN_LINK}\n\n` +
      `Install the app, allow Location ("Allow all the time") and Camera, then log in with the code and PIN above.`;
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`;
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
      if (newEmp.phone.trim()) body.phone = newEmp.phone.trim();
      await api.createEmployee(body);

      // Offer to send credentials on WhatsApp (opens with message pre-filled)
      const wa = whatsappCredentialLink({
        name: body.name, employee_code: body.employee_code,
        pin: body.pin, phone: body.phone,
      });
      if (wa) {
        setWaLink(wa);
        setEmpMsg(`✓ ${body.name} added — send them their login on WhatsApp:`);
      } else {
        setEmpMsg("✓ Employee added");
      }
      setNewEmp({ name: "", employee_code: "", pin: "", job_title: "", phone: "" });
      loadEmployees();
    } catch (e) {
      setEmpMsg("✗ " + e.message);
    }
  }

  async function addAdmin() {
    const name = window.prompt("New admin's full name:");
    if (!name || !name.trim()) return;
    const code = window.prompt("Login code (e.g. RAHUL):");
    if (!code || !code.trim()) return;
    const pin = window.prompt("PIN (4-6 digits):");
    if (!pin || !/^\d{4,6}$/.test(pin.trim())) {
      setError("PIN must be 4-6 digits");
      return;
    }
    try {
      await api.createEmployee({
        name: name.trim(),
        employee_code: code.trim().toUpperCase(),
        pin: pin.trim(),
        role: "admin",
        job_title: "Admin",
      });
      setEmpMsg(`✓ Admin ${name.trim()} created — they can log in with code ${code.trim().toUpperCase()}`);
      loadEmployees();
    } catch (e) {
      setError("Could not create admin: " + e.message);
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

  async function removeEmployee(emp) {
    if (!window.confirm(`Permanently delete ${emp.name}? Their attendance history stays, but the account is removed. This cannot be undone.`)) return;
    try {
      await api.deleteEmployee(emp.id);
      setEmpMsg(`✓ ${emp.name} deleted`);
      loadEmployees();
    } catch (e) {
      setError(e.message);
    }
  }

  function openEdit(emp) {
    setEditEmp({
      id: emp.id,
      name: emp.name || "",
      employee_code: emp.employee_code || "",
      job_title: emp.job_title || "",
      phone: emp.phone || "",
      pin: "",   // blank = leave unchanged
      assigned_site_ids: emp.assigned_site_ids || [],
    });
  }

  function toLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function openEditRec(r) {
    setEditRec({
      id: r.id,
      name: r.employee_name,
      clock_in: toLocalInput(r.clock_in),
      clock_out: toLocalInput(r.clock_out),
    });
  }
  async function saveEditRec() {
    const fields = {};
    if (editRec.clock_in) fields.clock_in = new Date(editRec.clock_in).toISOString();
    if (editRec.clock_out) fields.clock_out = new Date(editRec.clock_out).toISOString();
    try {
      await api.editAttendance(editRec.id, fields);
      setEmpMsg(`✓ ${editRec.name}'s times corrected`);
      setEditRec(null);
      loadAll();
    } catch (e) {
      setError("Could not save: " + e.message);
    }
  }

  async function viewSelfie(selfieId) {
    setSelfieView({ loading: true, image: null });
    try {
      const r = await api.selfie(selfieId);
      setSelfieView({ loading: false, image: r.image_base64 });
    } catch (e) {
      setSelfieView(null);
      setError("Could not load selfie: " + e.message);
    }
  }

  async function saveEdit() {
    const fields = {};
    if (editEmp.name.trim()) fields.name = editEmp.name.trim();
    fields.job_title = editEmp.job_title.trim();
    fields.phone = editEmp.phone.trim();
    if (editEmp.employee_code.trim()) fields.employee_code = editEmp.employee_code.trim();
    if (editEmp.pin.trim()) fields.pin = editEmp.pin.trim();   // only if entered
    fields.assigned_site_ids = editEmp.assigned_site_ids || [];
    try {
      await api.editEmployee(editEmp.id, fields);
      setEmpMsg(`✓ ${fields.name || "Employee"} updated`);
      setEditEmp(null);
      loadEmployees();
    } catch (e) {
      setError("Could not save: " + e.message);
    }
  }

  async function setRate(emp) {
    const current = emp.hourly_rate || 0;
    const input = window.prompt(`Set hourly rate for ${emp.name} (₹ per hour):`, current);
    if (input === null) return;
    const rate = parseFloat(input);
    if (isNaN(rate) || rate < 0) { setError("Enter a valid number"); return; }
    try {
      await api.setHourlyRate(emp.id, rate);
      setEmpMsg(`✓ ${emp.name}'s rate set to ₹${rate}/hr`);
      loadEmployees();
    } catch (e) {
      setError(e.message);
    }
  }

  async function setShift(emp) {
    const start = window.prompt(`${emp.name} — start time (HH:MM, 24h). Late after this.`, emp.shift_start || "11:00");
    if (start === null) return;
    const end = window.prompt(`${emp.name} — end time (HH:MM, 24h). Left-early before this.`, emp.shift_end || "20:30");
    if (end === null) return;
    if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) {
      setError("Use HH:MM format, e.g. 11:00"); return;
    }
    try {
      await api.setShift(emp.id, start, end);
      setEmpMsg(`✓ ${emp.name}: ${start}–${end}`);
      loadEmployees();
    } catch (e) {
      setError(e.message);
    }
  }

  async function forceClockOut(empId, name) {
    if (!window.confirm(`Force clock-out ${name}? Use this if they forgot to clock out.`)) return;
    try {
      await api.forceClockOut(empId);
      setEmpMsg(`✓ ${name} clocked out`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function runPayroll() {
    if (!payRange.start || !payRange.end) { setError("Pick a start and end date"); return; }
    try {
      const data = await api.payroll(payRange.start, payRange.end);
      setPayrollData(data);
    } catch (e) {
      setError("Payroll failed: " + e.message);
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
      // If a specific employee is selected in the dropdown, export only them.
      let empId = null;
      let namePart = "all";
      if (empFilter !== "all") {
        const row = report.find((r) => r.employee_name === empFilter);
        empId = row ? row.employee_id : null;
        namePart = empFilter.replace(/\s+/g, "_");
      }
      const blob = await api.exportCsv(range.start, range.end, empId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fieldtrack_${namePart}_${range.start}_to_${range.end}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export failed: " + e.message);
    }
  }

  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("This device/browser doesn't support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewSite((s) => ({
          ...s,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === 1
            ? "Location permission denied. Allow location access and try again."
            : "Couldn't get your location. Try again outdoors or check GPS."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

  async function editWifi(site) {
    const current = (site.wifi_bssids || []).join(", ");
    const input = window.prompt(
      `Allowed Wi-Fi for "${site.name}".\n\n` +
      `Enter the router BSSID(s), comma-separated. Leave blank for GPS-only.\n` +
      `Tip: find the BSSID on an Android phone connected to the showroom Wi-Fi ` +
      `(Settings → Wi-Fi → tap the network → BSSID), format aa:bb:cc:dd:ee:ff.`,
      current
    );
    if (input === null) return;
    const list = input.split(",").map((b) => b.trim()).filter(Boolean);
    try {
      await api.setSiteWifi(site.id, list);
      setSites(sites.map((s) => s.id === site.id ? { ...s, wifi_bssids: list } : s));
    } catch (e) {
      setError("Could not save Wi-Fi: " + e.message);
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
    { id: "payroll", label: "Payroll", icon: Download },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "sites", label: "Job Sites", icon: Activity },
  ];

  const stats = [
    { label: "Active Now", value: dash?.active_now, color: C.green, icon: Users, key: "active" },
    { label: "Present", value: dash?.present_today, color: C.accent, icon: Clock, key: "present" },
    { label: "Absent", value: dash?.absent_today, color: C.red, icon: Users, key: "absent" },
    { label: "Late", value: dash?.late_today, color: C.amber, icon: Clock, key: "late" },
    { label: "Flagged", value: dash?.flagged_today, color: C.amber, icon: AlertTriangle, key: "flagged" },
    { label: "Location OFF", value: dash?.location_off_now, color: C.red, icon: AlertTriangle, key: "location_off" },
    { label: "Blocked", value: dash?.blocked_attempts_today, color: C.red, icon: ShieldAlert, key: "blocked_attempts" },
  ];

  // Which detail list to show in the popup (null = closed)
  function openTile(key, label, color) {
    if (!alerts) return;
    setTileView({ key, label, color, list: alerts[key] || [] });
  }

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
            <Card key={s.label} style={{ padding: 14, textAlign: "center", cursor: "pointer" }}>
              <div onClick={() => openTile(s.key, s.label, s.color)}>
                <s.icon size={16} color={s.color} style={{ marginBottom: 4 }} />
                <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value ?? "—"}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{s.label}</div>
              </div>
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

            {(() => {
              const offline = live.filter((p) => p.signal_lost || p.location_disabled);
              if (offline.length === 0) return null;
              return (
                <Card style={{ borderColor: C.red }}>
                  <h3 style={{ ...h3, color: C.red }}>⚠ Offline / Not Reporting ({offline.length})</h3>
                  <p style={{ color: C.muted, fontSize: 12, marginTop: -6, marginBottom: 12 }}>
                    App hasn't reported in a while (killed by battery saver, location off, or no signal). Their time isn't counting.
                  </p>
                  {offline.map((p) => {
                    const digits = (p.phone || "").replace(/\D/g, "");
                    const wa = digits ? `https://wa.me/${digits.length === 10 ? "91" + digits : digits}?text=${encodeURIComponent(`Hi ${p.employee_name}, your FieldTrack app seems offline. Please open it and make sure Location is ON so your work time keeps counting.`)}` : null;
                    return (
                      <div key={p.employee_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                        <div>
                          <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{p.employee_name}</span>
                          <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>
                            {p.location_disabled ? "Location OFF" : `silent ${p.minutes_since_update}m`}
                          </span>
                        </div>
                        {wa ? (
                          <a href={wa} target="_blank" rel="noreferrer"
                            style={{ background: "#25D366", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 7, textDecoration: "none", whiteSpace: "nowrap" }}>
                            WhatsApp
                          </a>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>no number</span>
                        )}
                      </div>
                    );
                  })}
                </Card>
              );
            })()}

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
                        {p.present_minutes != null && (
                          <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                            Present: {fmtDur(p.present_minutes)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => viewPresence(p.employee_id, p.employee_name)}
                        style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12 }}>
                        Time away
                      </button>
                      <button onClick={() => forceClockOut(p.employee_id, p.employee_name)} title="Clock out (if they forgot)"
                        style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12, color: C.amber }}>
                        Clock out
                      </button>
                      {p.location_disabled
                        ? <Tag color={C.red}>🚫 Location OFF{p.location_off_count ? ` (${p.location_off_count}×)` : ""}</Tag>
                        : p.signal_lost
                        ? <Tag color={C.red}>⚠ Signal lost {p.minutes_since_update ? `(${p.minutes_since_update}m)` : ""}</Tag>
                        : p.flags?.length > 0
                        ? <Tag color={C.amber}>⚠ {friendlyFlag(p.flags[0])}</Tag>
                        : p.on_site === false
                        ? <Tag color={C.red}>● Away</Tag>
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
                                <span style={{ color: C.muted }}>{fmtDur(s.minutes)} away</span>
                              </div>
                            ))}
                            {presenceFor.data.still_away && (
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.amber, paddingVertical: 3 }}>
                                <span>Left {fmt(presenceFor.data.still_away.left_at)} · not back</span>
                                <span>{fmtDur(presenceFor.data.still_away.minutes)}</span>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: C.text, paddingTop: 6, marginTop: 4, borderTop: `1px solid ${C.border}` }}>
                              <span>Total away</span><span>{fmtDur(presenceFor.data.total_away_minutes)}</span>
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
        {tab === "logs" && (() => {
          const shown = empFilter === "all" ? report : report.filter((r) => r.employee_name === empFilter);
          const names = [...new Set(report.map((r) => r.employee_name))].sort();
          // Per-employee summary for the visible range
          const sums = {};
          shown.forEach((r) => {
            const s = sums[r.employee_name] || (sums[r.employee_name] = { days: 0, mins: 0, late: 0, early: 0, absent: 0 });
            if (r.status === "absent") { s.absent += 1; return; }
            s.days += 1;
            s.mins += r.duration_minutes || 0;
            if (r.is_late) s.late += 1;
            if (r.left_early) s.early += 1;
          });
          return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h3 style={{ ...h3, margin: 0 }}>Attendance Records</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}
                    style={{ ...dateInp, minWidth: 130 }}>
                    <option value="all">All employees</option>
                    {names.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} style={dateInp} />
                  <span style={{ color: C.muted }}>→</span>
                  <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} style={dateInp} />
                  <button onClick={() => setRange({ start: daysAgo(7), end: todayStr() })} style={{ ...btnSecondary, padding: "7px 10px", fontSize: 12 }}>This Week</button>
                  <button onClick={() => setRange({ start: daysAgo(30), end: todayStr() })} style={{ ...btnSecondary, padding: "7px 10px", fontSize: 12 }}>This Month</button>
                  <button onClick={loadAll} style={{ ...btnSecondary, padding: "7px 12px" }}>Apply</button>
                  <button onClick={exportCsv} style={btnPrimary}>
                    <Download size={14} /> {empFilter === "all" ? "Excel Report (all)" : `Excel: ${empFilter}`}
                  </button>
                </div>
              </div>

              {/* Per-employee summary for the selected range */}
              {Object.keys(sums).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 0", borderBottom: `2px solid ${C.border}`, fontSize: 12, color: C.muted, fontWeight: 700 }}>
                    <div>EMPLOYEE</div><div>DAYS</div><div>HOURS</div><div>LATE</div><div>LEFT EARLY / ABSENT</div>
                  </div>
                  {Object.entries(sums).sort().map(([name, s]) => (
                    <div key={name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                      <div style={{ color: C.text, fontWeight: 600 }}>{name}</div>
                      <div style={{ color: C.text }}>{s.days}</div>
                      <div style={{ color: C.text }}>{(s.mins / 60).toFixed(1)}</div>
                      <div style={{ color: s.late ? C.amber : C.muted }}>{s.late}</div>
                      <div style={{ color: (s.early || s.absent) ? C.red : C.muted }}>{s.early}{s.absent ? ` / ${s.absent} absent` : ""}</div>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ ...h3, fontSize: 13, color: C.muted }}>DETAIL</h3>
              {shown.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No records in this range.</p>}
              {shown.map((r) => (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1.5fr", gap: 8, padding: "11px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, alignItems: "center" }}>
                  <div style={{ color: C.text, fontWeight: 600 }}>{r.employee_name}</div>
                  <div style={{ color: C.muted }}>{new Date(r.date).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
                  {r.status === "absent" ? (
                    <>
                      <div style={{ color: C.red, fontWeight: 600 }}>Absent</div>
                      <div style={{ color: C.muted }}>—</div>
                      <div><Tag color={C.red}>Absent</Tag></div>
                    </>
                  ) : (
                    <>
                  <div style={{ color: C.text }}>
                    {fmt(r.clock_in)} → {fmt(r.clock_out)}{r.auto_closed && <span style={{ color: C.amber, fontSize: 11 }}> (auto)</span>}
                    {r.clock_in_location?.selfie && !String(r.clock_in_location.selfie).startsWith("selfie_stored") && (
                      <button onClick={() => viewSelfie(r.clock_in_location.selfie)} title="View clock-in selfie"
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 13, marginLeft: 4 }}>📷</button>
                    )}
                    <button onClick={() => openEditRec(r)} title="Correct these times"
                      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, marginLeft: 4, color: C.muted }}>✎</button>
                    {r.manually_edited && <span style={{ color: C.amber, fontSize: 10, marginLeft: 3 }}>edited</span>}
                  </div>
                  <div style={{ color: C.muted }}>{fmtDur(r.duration_minutes)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {r.is_late && <Tag color={C.amber}>Late</Tag>}
                  {r.left_early && <Tag color={C.red}>Left early</Tag>}
                  {!r.is_late && !r.left_early && <Tag color={C.green}>On Time</Tag>}
                  {r.flags?.length > 0 && <Tag color={C.red}>⚠</Tag>}
                  </div>
                    </>
                  )}
                </div>
              ))}
            </Card>
          </div>
          );
        })()}

        {/* PAYROLL */}
        {tab === "payroll" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Payroll</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -6, marginBottom: 12 }}>
                Pay = net hours worked (time on site) × each employee's hourly rate.
                Set rates in the Employees tab.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="date" value={payRange.start}
                  onChange={(e) => setPayRange({ ...payRange, start: e.target.value })} style={inp} />
                <input type="date" value={payRange.end}
                  onChange={(e) => setPayRange({ ...payRange, end: e.target.value })} style={inp} />
                <button onClick={runPayroll} style={btnPrimary}>Calculate</button>
              </div>
            </Card>

            {payrollData && (
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ ...h3, margin: 0 }}>
                    {payrollData.start} → {payrollData.end}
                  </h3>
                  <div style={{ color: C.green, fontSize: 18, fontWeight: 700 }}>
                    Total: ₹{payrollData.total_pay.toLocaleString()}
                  </div>
                </div>
                {payrollData.rows.length === 0 && <p style={{ color: C.muted }}>No attendance in this range.</p>}
                {payrollData.rows.map((r) => (
                  <div key={r.employee_id} style={rowStyle}>
                    <div>
                      <div style={{ color: C.text, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {r.hours} hrs × ₹{r.hourly_rate}/hr
                        {r.hourly_rate === 0 && <span style={{ color: C.amber }}> · set rate in Employees</span>}
                      </div>
                    </div>
                    <div style={{ color: C.green, fontSize: 16, fontWeight: 700 }}>₹{r.pay.toLocaleString()}</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
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
                <input placeholder="WhatsApp no. (optional)" value={newEmp.phone}
                  onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value.replace(/[^\d+]/g, "") })}
                  style={inp} />
                <button onClick={addEmployee} style={{ ...btnPrimary, padding: "9px 12px" }}>
                  <Plus size={15} /> Add
                </button>
              </div>
              {empMsg && (
                <p style={{ fontSize: 13, marginTop: 10, color: empMsg.startsWith("✓") ? C.green : C.red }}>{empMsg}</p>
              )}
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" onClick={() => setTimeout(() => setWaLink(null), 500)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, background: "#25D366", color: "#fff", padding: "9px 16px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
                  📲 Send login on WhatsApp
                </a>
              )}
              <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                The employee logs into the phone app with their code + PIN. Their phone binds on first login.
              </p>
            </Card>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ ...h3, margin: 0 }}>All Employees ({employees.length})</h3>
                <button onClick={addAdmin} title="Create another admin login"
                  style={{ ...btnSecondary, padding: "6px 12px", fontSize: 13 }}>
                  + Add Admin
                </button>
              </div>
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
                      <button onClick={() => setRate(e)} title="Set hourly pay rate"
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12 }}>
                        ₹{e.hourly_rate || 0}/hr
                      </button>
                    )}
                    {e.role !== "admin" && (
                      <button onClick={() => setShift(e)} title="Set shift start/end times"
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12 }}>
                        🕐 {e.shift_start || "11:00"}–{e.shift_end || "20:30"}
                      </button>
                    )}
                    {e.role !== "admin" && (
                      <button onClick={() => toggleEmployee(e)}
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12, color: e.active ? C.red : C.green }}>
                        {e.active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                    {e.role !== "admin" && (
                      <button onClick={() => openEdit(e)} title="Edit details"
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12 }}>
                        ✏️ Edit
                      </button>
                    )}
                    {e.role !== "admin" && (
                      <button onClick={() => removeEmployee(e)} title="Delete permanently"
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12, color: C.red }}>
                        <Trash2 size={13} />
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
              <button onClick={useMyLocation} disabled={locating}
                style={{ ...btnSecondary, marginTop: 10, justifyContent: "center", width: "100%", opacity: locating ? 0.6 : 1 }}>
                <Navigation size={14} /> {locating ? "Getting your location…" : "Use my current location"}
              </button>

              {/* Live radius slider */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Radius</span>
                  <span style={{ color: C.accent, fontSize: 14, fontWeight: 700 }}>{newSite.radius_m || 150} m</span>
                </div>
                <input type="range" min="50" max="1000" step="10"
                  value={newSite.radius_m || 150}
                  onChange={(e) => setNewSite({ ...newSite, radius_m: e.target.value })}
                  style={{ width: "100%", accentColor: C.accent }} />
                <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 11 }}>
                  <span>50 m (tight)</span><span>1000 m (wide)</span>
                </div>
              </div>

              {/* Interactive map */}
              <div style={{ marginTop: 14 }}>
                <RadiusMap
                  lat={newSite.latitude ? parseFloat(newSite.latitude) : null}
                  lng={newSite.longitude ? parseFloat(newSite.longitude) : null}
                  radius={parseFloat(newSite.radius_m) || 150}
                  onMarkerMove={(lat, lng) =>
                    setNewSite((s) => ({ ...s, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))
                  }
                />
              </div>

              <p style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>
                Tap "Use my current location" while standing at the site, then adjust the slider until the blue circle covers your whole work area (building + parking). 200–300 m suits most showrooms.
              </p>
            </Card>
            <Card>
              <h3 style={h3}>Configured Sites ({sites.length})</h3>
              {sites.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>No sites yet. Add one above — punches outside every site get blocked.</p>}
              {sites.map((s) => (
                <div key={s.id} style={rowStyle}>
                  <div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)} · {s.radius_m}m radius</div>
                    <div style={{ color: s.wifi_bssids?.length ? C.green : C.muted, fontSize: 12, marginTop: 2 }}>
                      {s.wifi_bssids?.length ? `📶 ${s.wifi_bssids.length} Wi-Fi network(s) set` : "📶 No Wi-Fi check (GPS only)"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => editWifi(s)} title="Set allowed Wi-Fi networks"
                      style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12 }}>Wi-Fi</button>
                    <button onClick={() => removeSite(s.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.red }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      {/* Tile detail popup */}
      {tileView && (
        <div onClick={() => setTileView(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, maxWidth: 420, width: "100%", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: tileView.color, fontSize: 16, margin: 0 }}>
                {tileView.label} ({tileView.list.length})
              </h3>
              <button onClick={() => setTileView(null)}
                style={{ background: "transparent", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            {tileView.list.length === 0 && <p style={{ color: C.muted, fontSize: 13 }}>Nobody in this list right now.</p>}
            {tileView.list.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
                <span style={{ color: C.text }}>
                  {item.name}
                  {item.code && <span style={{ color: C.muted, fontSize: 12 }}> · {item.code}</span>}
                </span>
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {item.reason ? friendlyFlag(item.reason)
                    : item.flags ? friendlyFlag(item.flags[0])
                    : item.clock_in ? `in ${fmt(item.clock_in)}${item.clock_out ? ` → ${fmt(item.clock_out)}` : ""}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {editEmp && (
        <div onClick={() => setEditEmp(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(ev) => ev.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, width: "100%", maxWidth: 420 }}>
            <h3 style={{ ...h3, marginTop: 0 }}>Edit Employee</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ color: C.muted, fontSize: 12 }}>Full name</label>
                <input value={editEmp.name} onChange={(e) => setEditEmp({ ...editEmp, name: e.target.value })} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12 }}>Login ID (code)</label>
                <input value={editEmp.employee_code} onChange={(e) => setEditEmp({ ...editEmp, employee_code: e.target.value.toUpperCase() })} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12 }}>New PIN (leave blank to keep current)</label>
                <input value={editEmp.pin} onChange={(e) => setEditEmp({ ...editEmp, pin: e.target.value.replace(/\D/g, "") })} maxLength={6} placeholder="••••" style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12 }}>Job title</label>
                <input value={editEmp.job_title} onChange={(e) => setEditEmp({ ...editEmp, job_title: e.target.value })} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12 }}>WhatsApp number</label>
                <input value={editEmp.phone} onChange={(e) => setEditEmp({ ...editEmp, phone: e.target.value.replace(/[^\d+]/g, "") })} style={{ ...inp, width: "100%" }} />
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 12 }}>Allowed job sites</label>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  Tick the sites this employee can clock in at. Leave all unticked = any site.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                  {sites.map((s) => {
                    const on = (editEmp.assigned_site_ids || []).includes(s.id);
                    return (
                      <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.text, fontSize: 13 }}>
                        <input type="checkbox" checked={on}
                          onChange={(e) => {
                            const cur = new Set(editEmp.assigned_site_ids || []);
                            if (e.target.checked) cur.add(s.id); else cur.delete(s.id);
                            setEditEmp({ ...editEmp, assigned_site_ids: [...cur] });
                          }} />
                        {s.name}
                      </label>
                    );
                  })}
                  {sites.length === 0 && <span style={{ color: C.muted, fontSize: 12 }}>No sites yet — add one in Job Sites.</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={saveEdit} style={{ ...btnPrimary, flex: 1 }}>Save Changes</button>
              <button onClick={() => setEditEmp(null)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editRec && (
        <div onClick={() => setEditRec(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(ev) => ev.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, width: "100%", maxWidth: 380 }}>
            <h3 style={{ ...h3, marginTop: 0 }}>Correct Times — {editRec.name}</h3>
            <p style={{ color: C.muted, fontSize: 12, marginTop: -6, marginBottom: 14 }}>
              Use this only to fix genuine errors (GPS failed, forgot to punch). The record will be marked "edited".
            </p>
            <label style={{ color: C.muted, fontSize: 12 }}>Clock in</label>
            <input type="datetime-local" value={editRec.clock_in}
              onChange={(e) => setEditRec({ ...editRec, clock_in: e.target.value })}
              style={{ ...inp, width: "100%", marginBottom: 10 }} />
            <label style={{ color: C.muted, fontSize: 12 }}>Clock out</label>
            <input type="datetime-local" value={editRec.clock_out}
              onChange={(e) => setEditRec({ ...editRec, clock_out: e.target.value })}
              style={{ ...inp, width: "100%" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={saveEditRec} style={{ ...btnPrimary, flex: 1 }}>Save</button>
              <button onClick={() => setEditRec(null)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selfieView && (
        <div onClick={() => setSelfieView(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100001, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(ev) => ev.stopPropagation()}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, maxWidth: 360 }}>
            <h3 style={{ ...h3, marginTop: 0 }}>Clock-in Selfie</h3>
            {selfieView.loading
              ? <p style={{ color: C.muted }}>Loading…</p>
              : <img src={`data:image/jpeg;base64,${selfieView.image}`} alt="Clock-in selfie"
                  style={{ width: "100%", borderRadius: 10 }} />}
            <button onClick={() => setSelfieView(null)} style={{ ...btnSecondary, width: "100%", marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}

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
