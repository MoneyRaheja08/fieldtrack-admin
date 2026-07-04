// Shared design tokens and small UI atoms.
export const C = {
  bg: "#0F1117", surface: "#181C27", card: "#1E2335", border: "#2A3050",
  accent: "#4F8EF7", accentLo: "#1A2E52", green: "#22C55E", red: "#EF4444",
  amber: "#F59E0B", text: "#E8ECF4", muted: "#6B7A9F",
};

// Parse a timestamp as UTC even if the backend omitted the trailing 'Z'.
const asUTC = (t) => {
  if (!t) return null;
  // If it's an ISO string without timezone info, append Z to mark it UTC
  if (typeof t === "string" && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(t)) {
    t = t + "Z";
  }
  return new Date(t);
};

export const fmt = (t) => {
  const d = asUTC(t);
  return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
};
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
  if (f === "WIFI_MISMATCH") return "Wrong Wi-Fi";
  if (f === "WIFI_NOT_CONNECTED") return "Not on shop Wi-Fi";
  if (f === "WIFI_LOST") return "Wi-Fi lost mid-shift";
  if (f === "GPS_ACCURACY_LOW") return "Weak GPS signal";
  if (f === "LOCATION_DISABLED") return "Location turned off";
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
