"use client";

import { useEffect, useRef } from "react";
import type { TrafficState } from "@/lib/routing/traffic";
import { TRAFFIC_FILL } from "@/lib/routing/traffic-presentation";

export type MapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  color: string;
  teamsHere: string[];
};

type LeafletMap = {
  remove(): void;
  invalidateSize(): void;
  setView([lat, lng]: [number, number], zoom: number): LeafletMap;
  on(event: string, fn: (...args: unknown[]) => void): LeafletMap;
};

type LeafletMarker = {
  setLatLng([lat, lng]: [number, number]): LeafletMarker;
  bindPopup(html: string): LeafletMarker;
  openPopup(): LeafletMarker;
  addTo(map: LeafletMap): LeafletMarker;
  remove(): void;
};

declare global {
  interface Window {
    L?: {
      map(el: HTMLDivElement, opts?: Record<string, unknown>): LeafletMap;
      tileLayer(url: string, opts?: Record<string, unknown>): { addTo(map: LeafletMap): void };
      marker([lat, lng]: [number, number], opts?: Record<string, unknown>): LeafletMarker;
      divIcon(opts?: Record<string, unknown>): unknown;
    };
  }
}

function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

/**
 * OpenStreetMap-based map using Leaflet. Drop-in alternative to the Google Maps
 * checkpoint-map for projects that want free tile access.
 *
 * Usage: <OsmMap points={points} height={400} />
 */
export function OsmMap({
  points,
  height = 400,
  onPointClick,
}: {
  points: MapPoint[];
  height?: number;
  onPointClick?: (pointId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadLeaflet();
      if (cancelled || !containerRef.current || !window.L) return;

      if (mapRef.current) {
        mapRef.current.invalidateSize();
        return;
      }

      const L = window.L;

      const map = L.map(containerRef.current, {
        center: center(points),
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e: unknown) => {
        const event = e as { latlng: { lat: number; lng: number } };
        if (onPointClick) {
          const closest = findClosest(points, event.latlng.lat, event.latlng.lng);
          if (closest) onPointClick(closest.id);
        }
      });

      mapRef.current = map;
    }

    init();
    return () => { cancelled = true; };
  }, [points, onPointClick]);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    const current = markersRef.current;

    for (const p of points) {
      const existing = current.get(p.id);
      if (existing) {
        existing.setLatLng([p.latitude, p.longitude]);
      } else {
        const marker = L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            className: "checkpoint-marker",
            html: `<div style="background:${p.color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(mapRef.current)
          .bindPopup(`<strong>${p.name}</strong><br>${p.teamsHere.length} teams here`);
        current.set(p.id, marker);
      }
    }

    // Remove markers for deleted points
    for (const [id, marker] of current) {
      if (!points.find((p) => p.id === id)) {
        marker.remove();
        current.delete(id);
      }
    }
  }, [points]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl" />;
}

function center(points: MapPoint[]): [number, number] {
  if (points.length === 0) return [0, 0];
  const lat = points.reduce((s, p) => s + p.latitude, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.longitude, 0) / points.length;
  return [lat, lng];
}

function findClosest(points: MapPoint[], lat: number, lng: number): MapPoint | null {
  if (points.length === 0) return null;
  let best = points[0];
  let bestDist = Infinity;
  for (const p of points) {
    const d = (p.latitude - lat) ** 2 + (p.longitude - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}
