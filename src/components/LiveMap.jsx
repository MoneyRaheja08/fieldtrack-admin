// Live employee map on a REAL map (Leaflet/OpenStreetMap).
// Employees appear at their actual GPS coordinates; job sites show as
// geofence circles. Replaces the old abstract-grid canvas version.
import { useEffect, useRef } from "react";
import { C } from "./ui";
import { api } from "../services/api";

export default function LiveMap({ live, sites }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const layerRef = useRef(null);
  const trailLayer = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current || mapObj.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([30.9010, 75.8573], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapObj.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    trailLayer.current = L.layerGroup().addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapObj.current || !layerRef.current) return;
    const map = mapObj.current;
    const group = layerRef.current;
    group.clearLayers();

    const bounds = [];

    (sites || []).forEach((s) => {
      L.circle([s.latitude, s.longitude], {
        radius: s.radius_m || 150,
        color: C.green, fillColor: C.green, fillOpacity: 0.08,
        weight: 1.5, dashArray: "4 4",
      }).addTo(group).bindPopup("<b>" + s.name + "</b><br/>" + (s.radius_m || 150) + "m radius");
      bounds.push([s.latitude, s.longitude]);
    });

    const points = (live || []).filter((p) => p.location);
    points.forEach((p) => {
      const flagged = p.flags && p.flags.length > 0;
      const away = p.on_site === false;
      const color = flagged ? C.amber : away ? C.red : C.accent;
      const initials = p.employee_name.split(" ").map((n) => n[0]).join("").slice(0, 2);
      const icon = L.divIcon({
        html: '<div style="background:' + color + ';width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5)">' + initials + '</div>',
        className: "", iconSize: [32, 32], iconAnchor: [16, 16],
      });
      let t = "";
      if (p.clock_in) {
        const raw = /[zZ]|[+-]\d\d:?\d\d$/.test(p.clock_in) ? p.clock_in : p.clock_in + "Z";
        t = new Date(raw).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      const statusLine = away ? "<br/><span style='color:#EF4444'>● Away from site</span>" : "<br/><span style='color:#22C55E'>● On site</span>";
      L.marker([p.location.lat, p.location.lng], { icon })
        .addTo(group)
        .bindPopup("<b>" + p.employee_name + "</b><br/>In at " + t + statusLine + (flagged ? "<br/>⚠ " + p.flags[0] : ""));
      bounds.push([p.location.lat, p.location.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [live, sites]);

  // Draw trails for employees who are currently OFF-site.
  // Each employee gets a distinct color so you can tell who went where.
  const TRAIL_COLORS = ["#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#14B8A6"];
  useEffect(() => {
    const L = window.L;
    if (!L || !trailLayer.current) return;
    const group = trailLayer.current;
    group.clearLayers();

    const awayPeople = (live || []).filter((p) => p.on_site === false);
    let cancelled = false;

    (async () => {
      for (let i = 0; i < awayPeople.length; i++) {
        const p = awayPeople[i];
        const color = TRAIL_COLORS[i % TRAIL_COLORS.length];
        try {
          const res = await api.trail(p.employee_id);
          if (cancelled || !res.points || res.points.length < 2) continue;
          const latlngs = res.points.map((pt) => [pt.lat, pt.lng]);

          // Colored dashed line, named after the employee
          L.polyline(latlngs, {
            color, weight: 3, opacity: 0.85, dashArray: "6 6",
          }).addTo(group).bindPopup("<b>" + p.employee_name + "</b><br/>Path while away");

          // Dots along the trail in the same color
          res.points.forEach((pt) => {
            L.circleMarker([pt.lat, pt.lng], {
              radius: 3, color, fillColor: color, fillOpacity: 0.9, weight: 1,
            }).addTo(group);
          });

          // Name tag at the trail's latest point so it's readable at a glance
          const last = latlngs[latlngs.length - 1];
          const nameTag = L.divIcon({
            html: '<div style="background:' + color + ';color:#fff;font-size:10px;font-weight:700;' +
                  'padding:2px 6px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.5)">' +
                  p.employee_name + '</div>',
            className: "", iconSize: null, iconAnchor: [0, -8],
          });
          L.marker(last, { icon: nameTag, interactive: false }).addTo(group);
        } catch { /* skip */ }
      }
    })();

    return () => { cancelled = true; };
  }, [live]);

  const activeCount = (live || []).filter((p) => p.location).length;

  return (
    <div>
      <div ref={mapRef} style={{ width: "100%", height: 320, borderRadius: 10, border: "1px solid " + C.border }} />
      {activeCount === 0 && (
        <p style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 8 }}>
          No employees clocked in right now — pins appear here when they do.
        </p>
      )}
    </div>
  );
}
