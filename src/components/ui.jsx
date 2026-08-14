// Shared design tokens and small UI atoms.
//
// This is an operations dashboard: dense tables of times, hours and money that
// someone scans quickly. So the palette is deliberately quiet — surfaces sit
// close together in value and colour does one job only: green = counted/paid,
// amber = needs attention, red = blocked or lost. Nothing else is coloured, so
// a coloured cell always means something.
export const C = {
  bg: "#0E1015",        // page — deepest, so cards lift off it
  surface: "#161A23",   // inputs, chips, secondary buttons
  card: "#1A1F2B",      // panels
  cardAlt: "#1E2431",   // zebra rows / table headers
  border: "#272E3D",    // neutral divider, not the old electric blue
  borderSoft: "#1F2532",// hairline inside dense tables
  accent: "#4F8EF7", accentLo: "#1A2E52",
  green: "#22C55E", red: "#EF4444", amber: "#F59E0B",
  text: "#E6EAF2",
  muted: "#8592AD",     // lifted from #6B7A9F — the old one was hard to read
  faint: "#5C6884",     // for de-emphasised meta only
};

// One type scale for the whole dashboard. `num` is the important one: tabular
// figures make every hours/time/rupee column line up digit under digit, which
// is the difference between a table you can scan and one you have to read.
export const T = {
  stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
  num: '"SF Mono", ui-monospace, "Roboto Mono", Menlo, Consolas, monospace',
  h1: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" },
  h2: { fontSize: 15, fontWeight: 650, letterSpacing: "-0.005em" },
  body: { fontSize: 13.5, fontWeight: 400 },
  small: { fontSize: 12, fontWeight: 400 },
  label: { fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" },
};

// Numbers that should align in columns (hours, times, money).
export const numeric = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1',
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
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "18px 20px", ...style,
  }}>
    {children}
  </div>
);

export const Tag = ({ color, children }) => (
  <span style={{
    background: color + "1A", color, border: `1px solid ${color}33`,
    borderRadius: 5, padding: "2px 8px", fontSize: 11.5, fontWeight: 600,
    whiteSpace: "nowrap",
  }}>
    {children}
  </span>
);

export const inp = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7,
  padding: "9px 11px", color: C.text, fontSize: 13, width: "100%",
  boxSizing: "border-box", outline: "none",
};
