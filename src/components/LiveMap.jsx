// Live employee map on a REAL map (Leaflet/OpenStreetMap).
// Employees appear at their actual GPS coordinates; job sites show as
// geofence circles. Replaces the old abstract-grid canvas version.
import { useEffect, useRef } from "react";
import { C } from "./ui";

export default function LiveMap({ live, sites }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const layerRef = useRef(null);

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
      const color = flagged ? C.amber : C.accent;
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
      L.marker([p.location.lat, p.location.lng], { icon })
        .addTo(group)
        .bindPopup("<b>" + p.employee_name + "</b><br/>In at " + t + (flagged ? "<br/>⚠ " + p.flags[0] : ""));
      bounds.push([p.location.lat, p.location.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [live, sites]);

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
