// Canvas-based live location map with geofence rings.
import { useEffect, useRef } from "react";
import { C } from "./ui";

export default function LiveMap({ live, sites }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.fillStyle = "#141824"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1E2740"; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let j = 0; j < H; j += 40) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke(); }

    const pts = (live || []).filter((l) => l.location);
    if (!pts.length) {
      ctx.fillStyle = C.muted; ctx.font = "14px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("No active employees", W / 2, H / 2);
      return;
    }
    const allLat = [...pts.map((p) => p.location.lat), ...(sites || []).map((s) => s.latitude)];
    const allLng = [...pts.map((p) => p.location.lng), ...(sites || []).map((s) => s.longitude)];
    const minLat = Math.min(...allLat), maxLat = Math.max(...allLat);
    const minLng = Math.min(...allLng), maxLng = Math.max(...allLng);
    const pad = 70;
    const px = (lng) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
    const py = (lat) => H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2);

    (sites || []).forEach((s) => {
      const x = px(s.longitude), y = py(s.latitude);
      ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34,197,94,0.08)"; ctx.fill();
      ctx.strokeStyle = "rgba(34,197,94,0.4)"; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.green; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(s.name, x, y + 48);
    });

    pts.forEach((p) => {
      const x = px(p.location.lng), y = py(p.location.lat);
      const flagged = p.flags?.length > 0;
      const col = flagged ? C.amber : C.accent;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = flagged ? "rgba(245,158,11,0.15)" : "rgba(79,142,247,0.15)"; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      const initials = p.employee_name.split(" ").map((n) => n[0]).join("");
      ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(initials, x, y + 3);
      const name = p.employee_name.split(" ")[0];
      ctx.fillStyle = C.surface; ctx.strokeStyle = C.border;
      const tw = ctx.measureText(name).width + 12;
      ctx.fillRect(x - tw / 2, y - 32, tw, 17); ctx.strokeRect(x - tw / 2, y - 32, tw, 17);
      ctx.fillStyle = C.text; ctx.font = "10px sans-serif";
      ctx.fillText(name, x, y - 20);
    });
  }, [live, sites]);

  return (
    <canvas ref={ref} width={620} height={320}
      style={{ width: "100%", height: "auto", borderRadius: 10, border: `1px solid ${C.border}` }} />
  );
}
