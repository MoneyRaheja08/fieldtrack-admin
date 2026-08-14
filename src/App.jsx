// FieldTrack Admin - main dashboard, wired to the live backend.
import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Users, Clock, AlertTriangle, ShieldAlert,
  Download, LogOut, RefreshCw, Trash2, Plus, Activity, UserPlus, Smartphone, Navigation, CalendarDays,
} from "lucide-react";
import { api, clearToken, getToken } from "./services/api";
import { C, T, numeric, fmt, fmtDur, friendlyFlag, Card, Tag, inp } from "./components/ui";
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
  const [newEmp, setNewEmp] = useState({ name: "", employee_code: "", pin: "", job_title: "", phone: "", assigned_site_ids: [], monthly_salary: "", shift_start: "11:00", shift_end: "20:30", offs_per_month: "" });
  const [waLink, setWaLink] = useState(null);
  const [empMsg, setEmpMsg] = useState("");
  const [tileView, setTileView] = useState(null); // {key, label, color, list}
  const [payrollData, setPayrollData] = useState(null);
  const [muster, setMuster] = useState(null);
  const [punch, setPunch] = useState(null);
  const [punchDate, setPunchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportTab, setReportTab] = useState("punch");   // which report is open
  const [healthList, setHealthList] = useState(null);
  const [wHours, setWHours] = useState(null);
  const [punct, setPunct] = useState(null);
  const [excs, setExcs] = useState(null);
  const [otRep, setOtRep] = useState(null);
  const [empSum, setEmpSum] = useState(null);
  const [sumEmpId, setSumEmpId] = useState("");
  const [master, setMaster] = useState(null);
  const [masterPage, setMasterPage] = useState(1);
  const [masterEmp, setMasterEmp] = useState("");
  const [masterStatus, setMasterStatus] = useState("");
  const [healthLoading, setHealthLoading] = useState(false);
  const [musterMonth, setMusterMonth] = useState(() => new Date().toISOString().slice(0, 7));
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
      if (newEmp.assigned_site_ids && newEmp.assigned_site_ids.length) body.assigned_site_ids = newEmp.assigned_site_ids;
      if (newEmp.monthly_salary !== "") body.monthly_salary = Number(newEmp.monthly_salary);
      if (newEmp.offs_per_month !== "") body.offs_per_month = Number(newEmp.offs_per_month);
      if (newEmp.shift_start) body.shift_start = newEmp.shift_start;
      if (newEmp.shift_end) body.shift_end = newEmp.shift_end;
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
      setNewEmp({ name: "", employee_code: "", pin: "", job_title: "", phone: "", assigned_site_ids: [], monthly_salary: "", shift_start: "11:00", shift_end: "20:30", offs_per_month: "" });
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
      monthly_salary: emp.monthly_salary || "",
      offs_per_month: emp.offs_per_month || "",
      shift_start: emp.shift_start || "11:00",
      shift_end: emp.shift_end || "20:30",
      web_clockin_allowed: !!emp.web_clockin_allowed,
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
    if (editEmp.monthly_salary !== "") fields.monthly_salary = Number(editEmp.monthly_salary);
    if (editEmp.offs_per_month !== "") fields.offs_per_month = Number(editEmp.offs_per_month);
    if (editEmp.shift_start) fields.shift_start = editEmp.shift_start;
    if (editEmp.shift_end) fields.shift_end = editEmp.shift_end;
    fields.web_clockin_allowed = !!editEmp.web_clockin_allowed;
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

  // Health check across ALL employees — including those clocked out or absent,
  // so you can diagnose "why were their hours low?" after the fact.
  async function loadMaster(page = 1) {
    try {
      setMaster(null);
      setMasterPage(page);
      setMaster(await api.attendanceMaster(range.start, range.end, {
        page, employeeId: masterEmp || undefined, status: masterStatus || undefined,
      }));
    } catch (e) { setError("Attendance Master failed: " + e.message); }
  }
  async function exportMaster() {
    try {
      const blob = await api.attendanceMasterExport(range.start, range.end, {
        employeeId: masterEmp || undefined, status: masterStatus || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `attendance_master_${range.start}_to_${range.end}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError("Export failed: " + e.message); }
  }

  async function loadPunctuality() {
    try { setPunct(null); setPunct(await api.punctuality(musterMonth)); }
    catch (e) { setError("Punctuality failed: " + e.message); }
  }
  async function loadExceptions() {
    try { setExcs(null); setExcs(await api.exceptionsReport(range.start, range.end)); }
    catch (e) { setError("Exceptions failed: " + e.message); }
  }
  async function loadOvertime() {
    try { setOtRep(null); setOtRep(await api.overtimeReport(musterMonth)); }
    catch (e) { setError("Overtime failed: " + e.message); }
  }
  async function loadEmpSummary() {
    if (!sumEmpId) { setError("Pick an employee first"); return; }
    try { setEmpSum(null); setEmpSum(await api.employeeSummary(sumEmpId, musterMonth)); }
    catch (e) { setError("Summary failed: " + e.message); }
  }

  async function loadWorkingHours() {
    try {
      setWHours(null);
      setWHours(await api.workingHours(musterMonth));
    } catch (e) { setError("Working hours failed: " + e.message); }
  }

  async function exportWorkingHours() {
    try {
      const blob = await api.workingHoursExport(musterMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `working_hours_${musterMonth}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError("Export failed: " + e.message); }
  }

  async function loadHealthAll() {
    setHealthLoading(true);
    try {
      const emps = await api.employees();
      const list = (emps || []).filter((e) => e.role !== "admin");
      const results = await Promise.all(
        list.map(async (e) => {
          try {
            const d = await api.employeeDiagnostics(e.id);
            return { id: e.id, name: e.name, code: e.employee_code, ...d };
          } catch {
            return { id: e.id, name: e.name, code: e.employee_code, verdict: "unknown", detail: "Could not load" };
          }
        })
      );
      const rank = { stalled: 0, no_pings: 1, slow: 2, healthy: 3, not_clocked_in: 4, unknown: 5 };
      results.sort((a, b) => (rank[a.verdict] ?? 9) - (rank[b.verdict] ?? 9));
      setHealthList(results);
    } catch (e) {
      setError("Health check failed: " + e.message);
    }
    setHealthLoading(false);
  }

  async function loadPunch() {
    try {
      setPunch(null);
      const d = await api.dailyPunch(punchDate);
      setPunch(d);
    } catch (e) {
      setError("Daily punch failed: " + e.message);
    }
  }

  async function exportPunch() {
    try {
      const blob = await api.dailyPunchExport(punchDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily_punch_${punchDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Export failed: " + e.message);
    }
  }

  async function loadMuster() {
    try {
      setMuster(null);
      const d = await api.muster(musterMonth);
      setMuster(d);
    } catch (e) {
      setError("Muster failed: " + e.message);
    }
  }

  async function exportMuster() {
    try {
      const blob = await api.musterExport(musterMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `muster_${musterMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Muster export failed: " + e.message);
    }
  }

  async function exportPayroll() {
    try {
      const blob = await api.payrollExport(payRange.start, payRange.end);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll_${payRange.start}_to_${payRange.end}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Excel export failed: " + e.message);
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

  // Load employees when a tab that needs the list opens.
  // Reports needs it too: the Employee Summary report has an employee picker,
  // and it was rendering an empty dropdown because the list had only ever been
  // fetched on the Employees tab.
  useEffect(() => {
    if (employee && (tab === "employees" || tab === "reports")) loadEmployees();
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
    { id: "reports", label: "Reports", icon: CalendarDays },
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
              <h1 style={{ color: C.text, ...T.h1, margin: 0 }}>FieldTrack Admin</h1>
              <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0", ...numeric }}>
                {dash?.date} · {dash?.active_now ?? 0} active in field
              </p>
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
            <Card key={s.label} style={{ padding: "13px 15px", cursor: "pointer" }}>
              <div onClick={() => openTile(s.key, s.label, s.color)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted, ...T.label }}>{s.label}</span>
                  <s.icon size={13} color={s.color} style={{ opacity: 0.75 }} />
                </div>
                <div style={{ color: s.color, fontSize: 26, fontWeight: 700, lineHeight: 1.15, marginTop: 6, ...numeric }}>
                  {s.value ?? "—"}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: C.surface, borderRadius: 9, padding: 3, border: `1px solid ${C.border}`, marginBottom: 16, overflowX: "auto" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, minWidth: 92, padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: tab === t.id ? C.card : "transparent", color: tab === t.id ? C.text : C.muted, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", transition: "background 120ms ease, color 120ms ease" }}>
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
        {tab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["master", "Attendance Master"], ["punch", "Daily Punch"], ["hours", "Working Hours"], ["muster", "Muster"], ["late", "Late & Early"], ["exceptions", "Exceptions"], ["ot", "Overtime"], ["summary", "Employee Summary"], ["health", "Health"]].map(([id, label]) => (
                <button key={id} onClick={() => setReportTab(id)}
                  style={{
                    ...btnSecondary,
                    padding: "7px 14px",
                    background: reportTab === id ? C.accentLo : "transparent",
                    color: reportTab === id ? C.text : C.muted,
                    borderColor: reportTab === id ? C.accent : C.border,
                    fontWeight: 600,
                  }}>
                  {label}
                </button>
              ))}
            </div>

        {reportTab === "punch" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Daily Punch Report</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                Every punch for one day — in/out times, hours, site, and any exceptions.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <input type="date" value={punchDate}
                  onChange={(e) => setPunchDate(e.target.value)} style={dateInp} />
                <button onClick={loadPunch} style={btnPrimary}>Load</button>
                {punch && (
                  <button onClick={exportPunch} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> Excel
                  </button>
                )}
              </div>
              {punch && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: 13 }}>
                  <span style={{ color: C.text }}><b>{punch.total_punches}</b> <span style={{ color: C.muted }}>punches</span></span>
                  <span style={{ color: C.green }}><b>{punch.total_hours}</b> <span style={{ color: C.muted }}>hrs</span></span>
                  <span style={{ color: C.amber }}><b>{punch.late_count}</b> <span style={{ color: C.muted }}>late</span></span>
                  <span style={{ color: C.accent }}><b>{punch.still_working}</b> <span style={{ color: C.muted }}>still working</span></span>
                  <span style={{ color: C.red }}><b>{punch.absentees.length}</b> <span style={{ color: C.muted }}>absent</span></span>
                </div>
              )}
            </Card>

            {punch && (
              <Card style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                  <thead>
                    <tr>
                      {["Employee", "Site", "In", "Out", "Hours", "Status", "Exceptions"].map((h) => (
                        <th key={h} style={{ ...musterTh, textAlign: h === "Employee" || h === "Exceptions" ? "left" : "center" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {punch.rows.map((r) => (
                      <tr key={r.record_id}>
                        <td style={{ ...musterTd, textAlign: "left", fontWeight: 600 }}>
                          {r.name} <span style={{ color: C.muted, fontWeight: 400 }}>· {r.code}</span>
                        </td>
                        <td style={{ ...musterTd, color: C.muted }}>{r.site}</td>
                        <td style={musterTd}>{r.clock_in || "—"}</td>
                        <td style={musterTd}>{r.clock_out || "—"}</td>
                        <td style={{ ...musterTd, color: C.green, fontWeight: 700 }}>
                          {r.hours}
                          {r.span_hours > r.hours && (
                            <div style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}>
                              of {r.span_hours}
                            </div>
                          )}
                        </td>
                        <td style={musterTd}>
                          <Tag color={r.status === "Working" ? C.accent : C.muted}>{r.status}</Tag>
                        </td>
                        <td style={{ ...musterTd, textAlign: "left", color: r.exceptions.length ? C.amber : C.muted }}>
                          {r.exceptions.length ? r.exceptions.join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {punch.rows.length === 0 && <p style={{ color: C.muted }}>No punches on this day.</p>}
              </Card>
            )}

            {punch && punch.absentees.length > 0 && (
              <Card>
                <h3 style={{ ...h3, color: C.red }}>Absent ({punch.absentees.length})</h3>
                {punch.absentees.map((a) => (
                  <div key={a.employee_id} style={rowStyle}>
                    <span style={{ color: C.text, fontSize: 14 }}>
                      {a.name} <span style={{ color: C.muted }}>· {a.code}</span>
                    </span>
                    <Tag color={C.red}>No punch</Tag>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {reportTab === "hours" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Working Hours Report</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                Day by day, where each person's hours went. <b style={{ color: C.green }}>Worked</b> is
                time on site — the number payroll pays on. <b style={{ color: C.amber }}>Away</b> is time
                outside the site or with location switched off.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <input type="month" value={musterMonth}
                  onChange={(e) => setMusterMonth(e.target.value)} style={dateInp} />
                <button onClick={loadWorkingHours} style={btnPrimary}>Load</button>
                {wHours && (
                  <button onClick={exportWorkingHours} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> Excel
                  </button>
                )}
              </div>
              {wHours && (
                <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>Total worked{" "}
                    <b style={{ color: C.green, fontSize: 15 }}>{wHours.grand_worked_hours}h</b></span>
                  <span style={{ color: C.muted }}>Total away{" "}
                    <b style={{ color: C.amber, fontSize: 15 }}>{wHours.grand_away_hours}h</b></span>
                </div>
              )}
            </Card>

            {wHours && (
              <Card style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ ...musterTh, textAlign: "left", position: "sticky", left: 0, background: C.card, minWidth: 150 }}>Employee</th>
                      <th style={{ ...musterTh, minWidth: 62 }}>Worked</th>
                      <th style={{ ...musterTh, minWidth: 56 }}>Away</th>
                      {Array.from({ length: wHours.days_in_month }, (_, i) => i + 1).map((d) => (
                        <th key={d} style={{ ...musterTh, minWidth: 44 }}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wHours.rows.map((r) => (
                      <tr key={r.employee_id}>
                        <td style={{ ...musterTd, textAlign: "left", position: "sticky", left: 0, background: C.card }}>
                          <div style={{ color: C.text, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{r.job_title || r.code}</div>
                        </td>
                        <td style={{ ...musterTd, color: C.green, fontWeight: 700 }}>{r.total_worked_hours}h</td>
                        <td style={{ ...musterTd, color: r.total_away_hours > 0 ? C.amber : C.muted, fontWeight: 600 }}>
                          {r.total_away_hours}h
                          {r.capped_days > 0 && (
                            <div style={{ color: C.red, fontSize: 10 }}>{r.capped_days} capped</div>
                          )}
                        </td>
                        {Array.from({ length: wHours.days_in_month }, (_, i) => i + 1).map((d) => {
                          const day = r.days[String(d)] || { worked: 0, away: 0 };
                          const w = day.worked, a = day.away;
                          const fmt = (m) => m ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}` : "";
                          return (
                            <td key={d} style={{ ...musterTd,
                              background: day.capped ? "#3a1a1a" : a > 0 ? "#3a2f14" : (w > 0 ? "#12351f" : "transparent") }}
                              title={day.capped ? "Capped — app was not running, so most of this span could not be verified" : undefined}>
                              <div style={{ color: day.capped ? C.red : w > 0 ? C.green : C.muted, fontWeight: 600 }}>
                                {fmt(w) || "—"}
                              </div>
                              {a > 0 && <div style={{ color: C.amber, fontSize: 10 }}>-{fmt(a)}</div>}
                              {day.capped && <div style={{ color: C.red, fontSize: 9 }}>capped</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {wHours.rows.length === 0 && <p style={{ color: C.muted }}>No employees found.</p>}
              </Card>
            )}
          </div>
        )}

        {reportTab === "master" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Attendance Master</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                One row per employee per day, including days they were absent —
                the full record to scroll, filter or export.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <input type="date" value={range.start}
                  onChange={(e) => setRange({ ...range, start: e.target.value })} style={dateInp} />
                <span style={{ color: C.muted }}>→</span>
                <input type="date" value={range.end}
                  onChange={(e) => setRange({ ...range, end: e.target.value })} style={dateInp} />
                <select value={masterEmp} onChange={(e) => setMasterEmp(e.target.value)} style={dateInp}>
                  <option value="">All employees</option>
                  {employees.filter((e) => e.role !== "admin").map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <select value={masterStatus} onChange={(e) => setMasterStatus(e.target.value)} style={dateInp}>
                  <option value="">All statuses</option>
                  <option value="present">Present only</option>
                  <option value="absent">Absent only</option>
                  <option value="late">Late only</option>
                </select>
                <button onClick={() => loadMaster(1)} style={btnPrimary}>Search</button>
                {master && (
                  <button onClick={exportMaster} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> Excel
                  </button>
                )}
              </div>
              {master && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: 13, color: C.muted }}>
                  <span><b style={{ color: C.green }}>{master.summary.present_rows}</b> present</span>
                  <span><b style={{ color: C.red }}>{master.summary.absent_rows}</b> absent</span>
                  <span><b style={{ color: C.amber }}>{master.summary.late_rows}</b> late</span>
                  <span><b style={{ color: C.text }}>{master.summary.total_hours}h</b> total</span>
                </div>
              )}
            </Card>

            {master && (
              <Card style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
                  <thead><tr>
                    {["Employee", "Date", "Day", "First", "Last", "Worked", "Away", "Site", "Status"].map((h, i) => (
                      <th key={h} style={{ ...musterTh, textAlign: i === 0 ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {master.rows.map((r, i) => (
                      <tr key={`${r.employee_id}-${r.date}-${i}`}>
                        <td style={{ ...musterTd, textAlign: "left" }}>
                          <div style={{ color: C.text, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ color: C.muted, fontSize: 10.5 }}>{r.job_title || r.code}</div>
                        </td>
                        <td style={musterTd}>{r.date.slice(5)}</td>
                        <td style={{ ...musterTd, color: C.muted }}>{r.day.slice(0, 3)}</td>
                        <td style={musterTd}>{r.first_punch || "—"}</td>
                        <td style={musterTd}>{r.last_punch || "—"}</td>
                        <td style={{ ...musterTd, color: r.working_minutes ? C.green : C.muted, fontWeight: 600 }}>
                          {r.working_minutes
                            ? `${Math.floor(r.working_minutes / 60)}:${String(r.working_minutes % 60).padStart(2, "0")}`
                            : "—"}
                        </td>
                        <td style={{ ...musterTd, color: r.away_minutes ? C.amber : C.muted }}>
                          {r.away_minutes
                            ? `${Math.floor(r.away_minutes / 60)}:${String(r.away_minutes % 60).padStart(2, "0")}`
                            : "—"}
                        </td>
                        <td style={{ ...musterTd, color: C.muted }}>{r.site}</td>
                        <td style={musterTd}>
                          <Tag color={r.status === "Absent" ? C.red : r.capped ? C.red : r.is_late ? C.amber : C.green}>
                            {r.capped ? "App off" : r.status}{r.is_late ? " · late" : ""}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
                  <span style={{ color: C.muted, fontSize: 12 }}>
                    Showing {(master.page - 1) * master.page_size + 1}–
                    {Math.min(master.page * master.page_size, master.total)} of {master.total}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => loadMaster(master.page - 1)} disabled={master.page <= 1}
                      style={{ ...btnSecondary, opacity: master.page <= 1 ? 0.4 : 1 }}>Previous</button>
                    <span style={{ color: C.text, fontSize: 12.5, padding: "0 6px" }}>
                      {master.page} / {master.pages}
                    </span>
                    <button onClick={() => loadMaster(master.page + 1)} disabled={master.page >= master.pages}
                      style={{ ...btnSecondary, opacity: master.page >= master.pages ? 0.4 : 1 }}>Next</button>
                  </div>
                </div>
                {master.rows.length === 0 && <p style={{ color: C.muted }}>No rows match these filters.</p>}
              </Card>
            )}
          </div>
        )}

        {reportTab === "late" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Late & Early-Leaving</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                Measured against each person's own shift times. Worst first.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <input type="month" value={musterMonth} onChange={(e) => setMusterMonth(e.target.value)} style={dateInp} />
                <button onClick={loadPunctuality} style={btnPrimary}>Load</button>
              </div>
              {punct && (
                <div style={{ marginTop: 12, fontSize: 13, color: C.muted }}>
                  <b style={{ color: C.amber, fontSize: 15 }}>{punct.total_late_days}</b> late arrivals ·{" "}
                  <b style={{ color: C.amber, fontSize: 15 }}>{punct.total_late_hours}h</b> lost in total
                </div>
              )}
            </Card>
            {punct && (
              <Card style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                  <thead><tr>
                    {["Employee", "Days", "Late days", "Total late", "Avg late", "Worst", "Left early", "On time"].map((h, i) => (
                      <th key={h} style={{ ...musterTh, textAlign: i === 0 ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {punct.rows.map((r) => (
                      <tr key={r.employee_id}>
                        <td style={{ ...musterTd, textAlign: "left" }}>
                          <div style={{ color: C.text, fontWeight: 600 }}>{r.name}</div>
                          <div style={{ color: C.muted, fontSize: 11 }}>{r.job_title || r.code}</div>
                        </td>
                        <td style={musterTd}>{r.days_worked}</td>
                        <td style={{ ...musterTd, color: r.late_days ? C.amber : C.muted, fontWeight: 700 }}>{r.late_days}</td>
                        <td style={{ ...musterTd, color: r.late_minutes ? C.amber : C.muted }}>
                          {Math.floor(r.late_minutes / 60)}h {r.late_minutes % 60}m
                        </td>
                        <td style={musterTd}>{r.avg_late_minutes}m</td>
                        <td style={musterTd}>
                          {r.worst_late ? `${r.worst_late}m` : "—"}
                          {r.worst_late_date && <div style={{ color: C.muted, fontSize: 10 }}>{r.worst_late_date.slice(5)}</div>}
                        </td>
                        <td style={{ ...musterTd, color: r.early_days ? C.amber : C.muted }}>{r.early_days}</td>
                        <td style={{ ...musterTd, color: r.punctuality_pct >= 90 ? C.green : r.punctuality_pct >= 70 ? C.amber : C.red, fontWeight: 700 }}>
                          {r.punctuality_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {punct.rows.length === 0 && <p style={{ color: C.muted }}>No attendance in this month.</p>}
              </Card>
            )}
          </div>
        )}

        {reportTab === "exceptions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Exceptions</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                Everything that needs a human look: forgotten clock-outs, admin edits,
                location switched off, anti-cheat flags and blocked attempts.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} style={dateInp} />
                <span style={{ color: C.muted }}>→</span>
                <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} style={dateInp} />
                <button onClick={loadExceptions} style={btnPrimary}>Load</button>
              </div>
              {excs && (
                <div style={{ marginTop: 12, fontSize: 13, color: C.muted }}>
                  <b style={{ color: C.text, fontSize: 15 }}>{excs.total}</b> exceptions ·{" "}
                  <b style={{ color: C.red, fontSize: 15 }}>{excs.high}</b> need attention
                </div>
              )}
            </Card>
            {excs && excs.by_person.length > 0 && (
              <Card>
                <h3 style={{ ...h3, fontSize: 13 }}>Most exceptions</h3>
                {excs.by_person.slice(0, 6).map(([name, n]) => (
                  <div key={name} style={rowStyle}>
                    <span style={{ color: C.text, fontSize: 13 }}>{name}</span>
                    <Tag color={n >= 5 ? C.red : C.amber}>{n}</Tag>
                  </div>
                ))}
              </Card>
            )}
            {excs && (
              <Card>
                {excs.items.map((it, i) => (
                  <div key={i} style={{
                    borderLeft: `3px solid ${it.severity === "high" ? C.red : it.severity === "warn" ? C.amber : C.muted}`,
                    paddingLeft: 12, marginBottom: 12,
                  }}>
                    <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>
                      {it.name} <span style={{ color: C.muted, fontWeight: 400 }}>· {it.date}</span>
                    </div>
                    <div style={{ color: it.severity === "high" ? C.red : C.amber, fontSize: 12 }}>
                      {it.type}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12 }}>{it.detail}</div>
                  </div>
                ))}
                {excs.items.length === 0 && <p style={{ color: C.green }}>🎉 No exceptions in this period.</p>}
              </Card>
            )}
          </div>
        )}

        {reportTab === "ot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Overtime</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                Hours beyond each person's standard monthly hours, and what it costs.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                <input type="month" value={musterMonth} onChange={(e) => setMusterMonth(e.target.value)} style={dateInp} />
                <button onClick={loadOvertime} style={btnPrimary}>Load</button>
              </div>
              {otRep && (
                <div style={{ marginTop: 12, fontSize: 13, color: C.muted }}>
                  <b style={{ color: C.amber, fontSize: 15 }}>{otRep.total_overtime_hours}h</b> overtime ·{" "}
                  <b style={{ color: C.green, fontSize: 15 }}>₹{otRep.total_overtime_cost.toLocaleString()}</b> cost
                </div>
              )}
            </Card>
            {otRep && (
              <Card style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                  <thead><tr>
                    {["Employee", "Standard", "Actual", "% of std", "Overtime", "Cost"].map((h, i) => (
                      <th key={h} style={{ ...musterTh, textAlign: i === 0 ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {otRep.rows.map((r) => (
                      <tr key={r.employee_id}>
                        <td style={{ ...musterTd, textAlign: "left", fontWeight: 600 }}>{r.name}</td>
                        <td style={musterTd}>{r.standard_hours}h</td>
                        <td style={musterTd}>{r.actual_hours}h</td>
                        <td style={{ ...musterTd, color: r.over_pct > 100 ? C.amber : C.muted }}>{r.over_pct}%</td>
                        <td style={{ ...musterTd, color: r.overtime_hours > 0 ? C.amber : C.muted, fontWeight: 700 }}>
                          {r.overtime_hours}h
                        </td>
                        <td style={{ ...musterTd, color: r.overtime_cost > 0 ? C.green : C.muted, fontWeight: 600 }}>
                          {r.overtime_cost > 0 ? `₹${r.overtime_cost.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {reportTab === "summary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Employee Summary</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                One person, one month, on a page — for a salary conversation.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <select value={sumEmpId} onChange={(e) => setSumEmpId(e.target.value)}
                  style={{ ...dateInp, minWidth: 200 }}>
                  <option value="">
                    {employees.length ? "Choose employee…" : "Loading employees…"}
                  </option>
                  {employees.filter((e) => e.role !== "admin").map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}{e.employee_code ? ` (${e.employee_code})` : ""}
                    </option>
                  ))}
                </select>
                <input type="month" value={musterMonth} onChange={(e) => setMusterMonth(e.target.value)} style={dateInp} />
                <button onClick={loadEmpSummary} style={btnPrimary}>Load</button>
              </div>
            </Card>

            {empSum && (
              <>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{empSum.employee.name}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {empSum.employee.job_title || empSum.employee.code} · shift {empSum.employee.shift} · {empSum.month}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: C.green, fontSize: 22, fontWeight: 700 }}>
                        ₹{empSum.estimated_pay.toLocaleString()}
                      </div>
                      <div style={{ color: C.muted, fontSize: 11 }}>estimated pay</div>
                    </div>
                  </div>
                </Card>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {[
                    ["Days present", `${empSum.days_present} / ${empSum.working_days}`, C.accent],
                    ["Worked", `${empSum.worked_hours}h`, C.green],
                    ["Standard", `${empSum.standard_hours}h`, C.muted],
                    ["Overtime", `${empSum.overtime_hours}h`, empSum.overtime_hours > 0 ? C.amber : C.muted],
                    ["Away", `${empSum.away_hours}h`, empSum.away_hours > 0 ? C.amber : C.muted],
                    ["Location off", `${empSum.location_off_hours}h`, empSum.location_off_hours > 0 ? C.red : C.muted],
                    ["Late days", `${empSum.late_days}`, empSum.late_days > 0 ? C.amber : C.muted],
                    ["Left early", `${empSum.early_days}`, empSum.early_days > 0 ? C.amber : C.muted],
                  ].map(([label, val, col]) => (
                    <Card key={label} style={{ padding: "12px 14px" }}>
                      <div style={{ color: C.muted, ...T.label }}>{label}</div>
                      <div style={{ color: col, fontSize: 20, fontWeight: 700, marginTop: 4, ...numeric }}>{val}</div>
                    </Card>
                  ))}
                </div>

                {empSum.exceptions.length > 0 && (
                  <Card>
                    <h3 style={{ ...h3, fontSize: 13, color: C.amber }}>Exceptions ({empSum.exceptions.length})</h3>
                    {empSum.exceptions.map((x, i) => (
                      <div key={i} style={rowStyle}>
                        <span style={{ color: C.muted, fontSize: 12 }}>{x.date}</span>
                        <span style={{ color: C.text, fontSize: 13 }}>{x.text}</span>
                      </div>
                    ))}
                  </Card>
                )}

                <Card style={{ overflowX: "auto" }}>
                  <h3 style={{ ...h3, fontSize: 13 }}>Day by day</h3>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
                    <thead><tr>
                      {["Date", "In", "Out", "Worked", "Away", "Late"].map((h, i) => (
                        <th key={h} style={{ ...musterTh, textAlign: i === 0 ? "left" : "center" }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {empSum.days.map((d) => (
                        <tr key={d.date}>
                          <td style={{ ...musterTd, textAlign: "left" }}>{d.date.slice(5)}</td>
                          <td style={musterTd}>{fmt(d.clock_in)}</td>
                          <td style={musterTd}>{d.clock_out ? fmt(d.clock_out) : "—"}</td>
                          <td style={{ ...musterTd, color: C.green, fontWeight: 600 }}>
                            {Math.floor(d.worked_minutes / 60)}:{String(d.worked_minutes % 60).padStart(2, "0")}
                          </td>
                          <td style={{ ...musterTd, color: d.away_minutes ? C.amber : C.muted }}>
                            {d.away_minutes ? `${Math.floor(d.away_minutes / 60)}:${String(d.away_minutes % 60).padStart(2, "0")}` : "—"}
                          </td>
                          <td style={{ ...musterTd, color: d.late_minutes ? C.amber : C.muted }}>
                            {d.late_minutes ? `${d.late_minutes}m` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </div>
        )}

        {reportTab === "muster" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Monthly Muster</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                The month-end attendance register. P = Present · H = Half day (worked less than half the shift) · A = Absent.
                Payable days counts each half day as 0.5.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <input type="month" value={musterMonth}
                  onChange={(e) => setMusterMonth(e.target.value)} style={dateInp} />
                <button onClick={loadMuster} style={btnPrimary}>Load Muster</button>
                {muster && (
                  <button onClick={exportMuster} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> Excel
                  </button>
                )}
              </div>
            </Card>

            {muster && (
              <Card style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ ...musterTh, textAlign: "left", position: "sticky", left: 0, background: C.card, minWidth: 140 }}>Employee</th>
                      {Array.from({ length: muster.days_in_month }, (_, i) => i + 1).map((d) => (
                        <th key={d} style={{ ...musterTh, minWidth: 26 }}>{d}</th>
                      ))}
                      <th style={musterTh}>P</th>
                      <th style={musterTh}>H</th>
                      <th style={musterTh}>A</th>
                      <th style={{ ...musterTh, minWidth: 60 }}>Payable</th>
                      <th style={{ ...musterTh, minWidth: 50 }}>Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {muster.rows.map((r) => (
                      <tr key={r.employee_id}>
                        <td style={{ ...musterTd, textAlign: "left", position: "sticky", left: 0, background: C.card, fontWeight: 600 }}>
                          {r.name}
                        </td>
                        {Array.from({ length: muster.days_in_month }, (_, i) => i + 1).map((d) => {
                          const m = r.days[String(d)] || "A";
                          const bg = m === "P" ? "#12351f" : m === "H" ? "#3a2f14" : "#3a1a1a";
                          const fg = m === "P" ? C.green : m === "H" ? C.amber : C.red;
                          return <td key={d} style={{ ...musterTd, background: bg, color: fg, fontWeight: 700 }}>{m}</td>;
                        })}
                        <td style={{ ...musterTd, color: C.green, fontWeight: 700 }}>{r.present_days}</td>
                        <td style={{ ...musterTd, color: C.amber, fontWeight: 700 }}>{r.half_days}</td>
                        <td style={{ ...musterTd, color: C.red, fontWeight: 700 }}>{r.absent_days}</td>
                        <td style={{ ...musterTd, fontWeight: 700 }}>{r.payable_days}</td>
                        <td style={{ ...musterTd, color: C.muted }}>{r.total_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {muster.rows.length === 0 && <p style={{ color: C.muted }}>No employees found.</p>}
              </Card>
            )}
          </div>
        )}

        {reportTab === "health" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Tracking Health — all employees</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -4 }}>
                Whose phone is actually sending pings. Open this when someone's hours look wrong —
                it tells you whether it was battery/permissions, location turned off, or genuine
                absence. Problems are listed first.
              </p>
              <button onClick={loadHealthAll} style={{ ...btnPrimary, marginTop: 10 }}
                disabled={healthLoading}>
                {healthLoading ? "Checking…" : "Check all employees"}
              </button>
            </Card>

            {healthList && (
              <Card>
                {healthList.map((h) => {
                  const col = h.verdict === "healthy" ? C.green
                    : h.verdict === "slow" ? C.amber
                    : h.verdict === "not_clocked_in" ? C.muted : C.red;
                  const icon = h.verdict === "healthy" ? "✅"
                    : h.verdict === "slow" ? "⚠️"
                    : h.verdict === "not_clocked_in" ? "—" : "⛔";
                  return (
                    <div key={h.id} style={{ borderLeft: `3px solid ${col}`, paddingLeft: 12, marginBottom: 14 }}>
                      <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>
                        {icon} {h.name} <span style={{ color: C.muted, fontWeight: 400 }}>· {h.code}</span>
                      </div>
                      <div style={{ color: col, fontSize: 13, marginTop: 2 }}>{h.detail}</div>
                      <div style={{ fontSize: 12, marginTop: 3 }}>
                        <span style={{ color: C.muted }}>App: </span>
                        <span style={{ color: h.app_outdated ? C.amber : C.muted, fontWeight: h.app_outdated ? 700 : 400 }}>
                          {h.app_version || "unknown"}
                          {h.app_outdated === true && " — OUTDATED, needs the new APK"}
                          {h.app_outdated === false && " ✓ latest"}
                        </span>
                      </div>
                      {h.beats_today != null && (
                        <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
                          {h.beats_today} pings · biggest gap {h.largest_gap_minutes}m ·{" "}
                          <span style={{ color: h.dropped_minutes > 0 ? C.amber : C.muted }}>
                            {h.dropped_minutes}m not counted
                          </span>
                          {h.location_off_events_today > 0 && (
                            <span style={{ color: C.red }}> · location off {h.location_off_events_today}x</span>
                          )}
                        </div>
                      )}
                      {h.dropped_gaps?.length > 0 && (
                        <div style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                          Gaps lost: {h.dropped_gaps.map((g) => `${g.minutes}m`).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
                {healthList.length === 0 && <p style={{ color: C.muted }}>No employees found.</p>}
              </Card>
            )}
          </div>
        )}
          </div>
        )}

        {tab === "payroll" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <h3 style={h3}>Payroll</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: -6, marginBottom: 12 }}>
                Pay = (monthly salary ÷ standard monthly hours) × actual hours worked.
                Set salary, shift times & offs per employee in Employees → Edit.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="date" value={payRange.start}
                  onChange={(e) => setPayRange({ ...payRange, start: e.target.value })} style={inp} />
                <input type="date" value={payRange.end}
                  onChange={(e) => setPayRange({ ...payRange, end: e.target.value })} style={inp} />
                <button onClick={runPayroll} style={btnPrimary}>Calculate</button>
                {payrollData && (
                  <button onClick={exportPayroll} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={14} /> Excel
                  </button>
                )}
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
                  <div key={r.employee_id} style={{ ...rowStyle, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.text, fontWeight: 600 }}>{r.name}</div>
                      {r.basis === "salary" ? (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ color: C.muted, fontSize: 11 }}>
                            ₹{r.monthly_salary?.toLocaleString()}/mo ÷ {r.standard_hours}h standard = ₹{r.hourly_rate}/hr · worked {r.hours}h
                          </div>
                          <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                            <div>
                              <div style={{ color: C.muted, fontSize: 11 }}>Regular ({r.regular_hours}h)</div>
                              <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>₹{r.regular_pay?.toLocaleString()}</div>
                            </div>
                            <div>
                              <div style={{ color: r.overtime_hours > 0 ? C.amber : C.muted, fontSize: 11 }}>Overtime ({r.overtime_hours}h)</div>
                              <div style={{ color: r.overtime_hours > 0 ? C.amber : C.muted, fontSize: 14, fontWeight: 600 }}>₹{r.overtime_pay?.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                          {r.hours} hrs × ₹{r.hourly_rate}/hr
                          {r.hourly_rate === 0 && <span style={{ color: C.amber }}> · set salary in Employees → Edit</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: C.muted, fontSize: 10 }}>TOTAL</div>
                      <div style={{ color: C.green, fontSize: 16, fontWeight: 700 }}>₹{r.pay.toLocaleString()}</div>
                    </div>
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
                {Object.entries(
                  alerts.absent.reduce((acc, a) => {
                    const sites = a.sites && a.sites.length ? a.sites : ["Unassigned"];
                    sites.forEach((s) => { (acc[s] = acc[s] || []).push(a); });
                    return acc;
                  }, {})
                ).map(([site, people]) => (
                  <div key={site} style={{ marginBottom: 12 }}>
                    <div style={{ color: C.accent, fontWeight: 700, fontSize: 13, margin: "6px 0" }}>📍 {site} ({people.length})</div>
                    {people.map((a) => (
                      <div key={a.id} style={rowStyle}>
                        <span style={{ color: C.text, fontSize: 14 }}>{a.name} <span style={{ color: C.muted }}>· {a.code}</span></span>
                        <Tag color={C.red}>No clock-in</Tag>
                      </div>
                    ))}
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
                <input type="number" placeholder="Monthly salary ₹" value={newEmp.monthly_salary}
                  onChange={(e) => setNewEmp({ ...newEmp, monthly_salary: e.target.value })}
                  style={inp} />
                <input type="time" title="Shift start" value={newEmp.shift_start}
                  onChange={(e) => setNewEmp({ ...newEmp, shift_start: e.target.value })}
                  style={inp} />
                <input type="time" title="Shift end" value={newEmp.shift_end}
                  onChange={(e) => setNewEmp({ ...newEmp, shift_end: e.target.value })}
                  style={inp} />
                <input type="number" placeholder="Offs/month" value={newEmp.offs_per_month}
                  onChange={(e) => setNewEmp({ ...newEmp, offs_per_month: e.target.value })}
                  style={inp} />
                <button onClick={addEmployee} style={{ ...btnPrimary, padding: "9px 12px" }}>
                  <Plus size={15} /> Add
                </button>
              </div>
              {sites.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                    Allowed job sites (optional — leave unticked = any site):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {sites.map((s) => {
                      const on = (newEmp.assigned_site_ids || []).includes(s.id);
                      return (
                        <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.text, fontSize: 13 }}>
                          <input type="checkbox" checked={on}
                            onChange={(e) => {
                              const cur = new Set(newEmp.assigned_site_ids || []);
                              if (e.target.checked) cur.add(s.id); else cur.delete(s.id);
                              setNewEmp({ ...newEmp, assigned_site_ids: [...cur] });
                            }} />
                          {s.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
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
                    {e.role !== "admin" && e.web_clockin_allowed && (
                      <span style={{
                        background: C.surface, border: `1px solid ${C.accent}`, color: C.accent,
                        borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700,
                      }} title="Allowed to use the iPhone/web clock-in page">
                        📱 iPhone
                      </span>
                    )}
                    {e.role !== "admin" && (
                      <button onClick={() => openEdit(e)} title="Set monthly salary"
                        style={{ ...btnSecondary, padding: "5px 9px", fontSize: 12 }}>
                        {e.monthly_salary ? `₹${e.monthly_salary.toLocaleString()}/mo` : "Set salary"}
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
                <label style={{ color: C.muted, fontSize: 12 }}>Monthly salary (₹)</label>
                <input type="number" value={editEmp.monthly_salary}
                  onChange={(e) => setEditEmp({ ...editEmp, monthly_salary: e.target.value })}
                  placeholder="e.g. 20000" style={{ ...inp, width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: C.muted, fontSize: 12 }}>Shift start</label>
                  <input type="time" value={editEmp.shift_start}
                    onChange={(e) => setEditEmp({ ...editEmp, shift_start: e.target.value })}
                    style={{ ...inp, width: "100%" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: C.muted, fontSize: 12 }}>Shift end</label>
                  <input type="time" value={editEmp.shift_end}
                    onChange={(e) => setEditEmp({ ...editEmp, shift_end: e.target.value })}
                    style={{ ...inp, width: "100%" }} />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ color: C.muted, fontSize: 12 }}>Offs/mo</label>
                  <input type="number" value={editEmp.offs_per_month}
                    onChange={(e) => setEditEmp({ ...editEmp, offs_per_month: e.target.value })}
                    placeholder="4" style={{ ...inp, width: "100%" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: C.text, fontSize: 13 }}>
                  <input type="checkbox" checked={!!editEmp.web_clockin_allowed}
                    onChange={(e) => setEditEmp({ ...editEmp, web_clockin_allowed: e.target.checked })} />
                  📱 Allow iPhone / web clock-in
                </label>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Tick ONLY for staff who use an iPhone. Android staff must use the app —
                  the web page has no background tracking, so it would let them punch in
                  without the geofence and ping checks.
                </div>
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

const h3 = { color: C.text, ...T.h2, margin: "0 0 10px" };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.borderSoft}` };
const avatar = { width: 36, height: 36, borderRadius: "50%", background: C.accentLo, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 };
const btnSecondary = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px", color: C.text, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, lineHeight: 1.2 };
const btnPrimary = { background: C.accent, color: "#fff", border: "none", borderRadius: 7, padding: "8px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.2 };
const dateInp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 10px", color: C.text, fontSize: 12.5, ...numeric, outline: "none" };
const musterTh = {
  padding: "9px 6px", textAlign: "center", color: C.muted,
  fontSize: 10.5, fontWeight: 600, letterSpacing: "0.03em",
  background: C.cardAlt, borderBottom: `1px solid ${C.border}`,
  whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1,
};
const musterTd = {
  padding: "7px 6px", textAlign: "center", borderBottom: `1px solid ${C.borderSoft}`,
  color: C.text, whiteSpace: "nowrap", ...numeric, fontSize: 12,
};
const tagInline = { fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", marginLeft: 8 };
