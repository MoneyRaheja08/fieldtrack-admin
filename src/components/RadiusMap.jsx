// Interactive map for visualizing a geofence radius.
// Uses Leaflet via CDN (loaded in index.html) — no API key, free.
import { useEffect, useRef } from "react";
import { C } from "./ui";

export default function RadiusMap({ lat, lng, radius, onMarkerMove }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const circleRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize the map once Leaflet is available
  useEffect(() => {
    if (!window.L || !mapRef.current || mapObj.current) return;
    const L = window.L;

    const startLat = lat || 30.9010;   // default near Ludhiana
    const startLng = lng || 75.8573;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([startLat, startLng], 17);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    // Draggable marker = the site center
    const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
    const circle = L.circle([startLat, startLng], {
      radius: radius || 150,
      color: "#4F8EF7",
      fillColor: "#4F8EF7",
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);

    marker.on("drag", (e) => {
      const { lat, lng } = e.target.getLatLng();
      circle.setLatLng([lat, lng]);
    });
    marker.on("dragend", (e) => {
      const { lat, lng } = e.target.getLatLng();
      if (onMarkerMove) onMarkerMove(lat, lng);
    });

    mapObj.current = map;
    circleRef.current = circle;
    markerRef.current = marker;

    // Fix tile rendering inside flex containers
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  // Update center when lat/lng props change (e.g. "Use my location")
  useEffect(() => {
    if (!mapObj.current || lat == null || lng == null) return;
    const pos = [lat, lng];
    markerRef.current.setLatLng(pos);
    circleRef.current.setLatLng(pos);
    mapObj.current.setView(pos, mapObj.current.getZoom());
  }, [lat, lng]);

  // Update circle size when radius changes
  useEffect(() => {
    if (circleRef.current && radius) circleRef.current.setRadius(radius);
  }, [radius]);

  return (
    <div>
      <div ref={mapRef} style={{ width: "100%", height: 300, borderRadius: 10, border: `1px solid ${C.border}` }} />
      <p style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
        Drag the pin to fine-tune the center. The blue circle is the area employees must be inside to clock in.
      </p>
    </div>
  );
}
