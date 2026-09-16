"use client";

import { useEffect, useRef, useState } from "react";
import { TRAFFIC_FILL } from "@/lib/routing/traffic-presentation";
import type { MapPoint } from "./checkpoint-map";

type LatLng = { lat: number; lng: number };

type LeafletMarker = {
  setLatLng([lat, lng]: [number, number]): LeafletMarker;
  setIcon(icon: unknown): LeafletMarker;
  bindPopup(html: string): LeafletMarker;
  on(event: string, fn: (...args: unknown[]) => void): LeafletMarker;
  getLatLng(): LatLng;
  addTo(map: LeafletMap): LeafletMarker;
  remove(): void;
};

type LeafletMap = {
  remove(): void;
  invalidateSize(): void;
  setView([lat, lng]: [number, number], zoom: number): LeafletMap;
  on(event: string, fn: (...args: unknown[]) => void): LeafletMap;
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

const LEAFLET_VERSION = "1.9.4";

/**
 * Leaflet ships from a CDN rather than npm: it is only ever needed in the
 * browser, on one screen, and this keeps it out of the bundle entirely.
 */
let leafletPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
    script.onload = () => resolve();
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error("Leaflet failed to load"));
    };
    document.body.appendChild(script);
  });
  return leafletPromise;
}

function dot(color: string, ring: boolean) {
  return `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.35)${ring ? ";outline:2px solid " + color + ";outline-offset:2px" : ""}"></div>`;
}

/**
 * OpenStreetMap view of the checkpoints, used whenever no Google Maps key is
 * configured. Same contract as the Google path above it: `value` is the point
 * being edited and clicking or dragging reports new coordinates through
 * `onChange`.
 *
 * Colour comes from the traffic tokens, never a literal, and carries a ring
 * for "approaching" so state is not signalled by hue alone. See the colour
 * rules in app/globals.css.
 */
export function OsmMap({
  value,
  onChange,
  points,
  height = 320,
}: {
  value?: { latitude: number; longitude: number } | null;
  onChange?: (lat: number, lng: number) => void;
  points: MapPoint[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, { marker: LeafletMarker; color: string }>());
  const valueMarkerRef = useRef<LeafletMarker | null>(null);

  // Leaflet arrives over the network, so the map exists only some time after
  // mount. The marker effects below are keyed on this: without it they run
  // once against a null map, find nothing to draw, and never run again.
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Read through a ref so a new inline callback never tears down the map.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const center: [number, number] = value
    ? [value.latitude, value.longitude]
    : points.length > 0
      ? [points[0].latitude, points[0].longitude]
      : [28.5449, 77.1926];

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then(() => {
        if (cancelled || mapRef.current || !containerRef.current || !window.L) return;
        const L = window.L;

        const map = L.map(containerRef.current, { center, zoom: 16 });
        L.tileLayer(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, {
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        map.on("click", (e: unknown) => {
          const { latlng } = e as { latlng: LatLng };
          onChangeRef.current?.(Number(latlng.lat.toFixed(6)), Number(latlng.lng.toFixed(6)));
        });

        mapRef.current = map;
        setReady(true);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
    // Center is only the initial view; re-centering on every prop change would
    // fight the organizer panning the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checkpoint markers, kept in step with props.
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    const live = markersRef.current;
    for (const p of points) {
      const color = TRAFFIC_FILL[p.state ?? "GREEN"];
      const icon = L.divIcon({
        className: "",
        html: dot(color, p.state === "YELLOW"),
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const existing = live.get(p.id);
      if (existing) {
        existing.marker.setLatLng([p.latitude, p.longitude]);
        if (existing.color !== color) {
          existing.marker.setIcon(icon);
          existing.color = color;
        }
      } else {
        const marker = L.marker([p.latitude, p.longitude], { icon })
          .addTo(map)
          .bindPopup(`<strong>${p.name}</strong>`);
        live.set(p.id, { marker, color });
      }
    }

    for (const [id, entry] of live) {
      if (!points.find((p) => p.id === id)) {
        entry.marker.remove();
        live.delete(id);
      }
    }
  }, [points, ready]);

  // The point being edited: draggable, and reports where it lands.
  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (!value) {
      valueMarkerRef.current?.remove();
      valueMarkerRef.current = null;
      return;
    }

    if (valueMarkerRef.current) {
      valueMarkerRef.current.setLatLng([value.latitude, value.longitude]);
      return;
    }

    // A divIcon rather than Leaflet's default marker, whose PNGs resolve
    // relative to the script and would be a second thing to go wrong offline.
    const marker = L.marker([value.latitude, value.longitude], {
      draggable: Boolean(onChangeRef.current),
      icon: L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--primary-strong);border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,.4)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
      }),
    }).addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onChangeRef.current?.(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });
    valueMarkerRef.current = marker;
  }, [value, ready]);

  useEffect(() => {
    const live = markersRef.current;
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      live.clear();
      valueMarkerRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full overflow-hidden rounded-lg border bg-muted"
      />
      <p className="text-xs text-muted-foreground">
        {failed
          ? "The map could not load. Check the network, or type coordinates below."
          : onChange
            ? "OpenStreetMap. Click the map or drag the pin to set the location, or type coordinates below."
            : "OpenStreetMap. No Google Maps key configured."}
      </p>
    </div>
  );
}
