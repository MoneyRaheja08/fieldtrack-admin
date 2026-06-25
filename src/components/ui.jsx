// Shared design tokens and small UI atoms.
export const C = {
  bg: "#0F1117", surface: "#181C27", card: "#1E2335", border: "#2A3050",
  accent: "#4F8EF7", accentLo: "#1A2E52", green: "#22C55E", red: "#EF4444",
  amber: "#F59E0B", text: "#E8ECF4", muted: "#6B7A9F",
};

export const fmt = (t) =>
  t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtDur = (m) =>
  m != null ? `${Math.floor(m / 60)}h ${m % 60}m` : "active";

export const friendlyFlag = (f = "") => {
  if (f.startsWith("IMPOSSIBLE_SPEED")) return "Teleport / impossible speed";
  if (f.startsWith("OUTSIDE_GEOFENCE")) return "Outside job site";
  if (f === "MOCKED_LOCATION") return "Fake GPS detected";
  if (f === "DEVICE_MISMATCH") return "Wrong device";
  if (f === "MISSING_SELFIE") return "No selfie";
  if (f === "NO_DEVICE_BOUND") return "No device bound";
  if (f === "NO_SITES_CONFIGURED") return "No sites set up";
  return f;
};

export const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, ...style }}>
    {children}
  </div>
);

export const Tag = ({ color, children }) => (
  <span style={{ background: color + "22", color, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
    {children}
  </span>
);

export const inp = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "9px 10px", color: C.text, fontSize: 13, width: "100%", boxSizing: "border-box",
};
