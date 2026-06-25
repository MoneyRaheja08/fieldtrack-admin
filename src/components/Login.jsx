// Admin login - authenticates against the real backend.
import { useState } from "react";
import { MapPin } from "lucide-react";
import { api, setToken } from "../services/api";
import { C, Card } from "./ui";

export default function Login({ onAuthed }) {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setErr("");
    try {
      // Admin logs in from a fixed "web" device id - binding doesn't
      // restrict admins the way it does field staff.
      const res = await api.login(code.trim().toUpperCase(), pin, "admin-web-console");
      if (res.employee?.role !== "admin") {
        setErr("This account is not an admin.");
        setBusy(false);
        return;
      }
      setToken(res.access_token);
      onAuthed(res.employee);
    } catch (e) {
      setErr(e.message || "Login failed");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif", padding: 20 }}>
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <MapPin size={32} color={C.accent} />
          <h1 style={{ color: C.text, fontSize: 22, margin: "8px 0 2px" }}>FieldTrack Admin</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Manager Dashboard</p>
        </div>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Admin code"
          style={field} />
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" type="password"
          onKeyDown={(e) => e.key === "Enter" && login()}
          style={{ ...field, marginTop: 10 }} />
        {err && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</p>}
        <button onClick={login} disabled={busy}
          style={{ width: "100%", background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: 13, fontSize: 15, fontWeight: 700, marginTop: 14, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </Card>
    </div>
  );
}

const field = {
  width: "100%", boxSizing: "border-box", background: C.surface,
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px",
  color: C.text, fontSize: 15,
};
