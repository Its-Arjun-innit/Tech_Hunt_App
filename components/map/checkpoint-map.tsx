"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { haversine } from "@/lib/routing/engine";

export type MapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Colour band for the live map; defaults to neutral. */
  state?: "GREEN" | "YELLOW" | "RED" | "GRAY";
};

const STATE_COLOR: Record<string, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#ef4444",
  GRAY: "#94a3b8",
};

export function CheckpointMap({
  apiKey,
  value,
  onChange,
  points,
  height = 320,
  draggableMarker = true,
}: {
  apiKey: string;
  /** The point being edited, if any. */
  value?: { latitude: number; longitude: number } | null;
  onChange?: (lat: number, lng: number) => void;
  points: MapPoint[];
  height?: number;
  draggableMarker?: boolean;
}) {
  // Without a key the whole Google stack is skipped and a local plot is drawn.
  if (!apiKey) {
    return <FallbackMap value={value} onChange={onChange} points={points} height={height} />;
  }

  const center = value
    ? { lat: value.latitude, lng: value.longitude }
    : points.length > 0
      ? { lat: points[0].latitude, lng: points[0].longitude }
      : { lat: 28.5449, lng: 77.1926 };

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "marker"]}>
      <div className="space-y-2">
        {onChange && <PlaceSearch onPick={onChange} />}
        <div style={{ height }} className="overflow-hidden rounded-lg border">
          <Map
            defaultCenter={center}
            defaultZoom={17}
            mapId="campus-hunt"
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={(e) => {
              const pos = e.detail.latLng;
              if (pos && onChange) onChange(pos.lat, pos.lng);
            }}
          >
            {points.map((p) => (
              <AdvancedMarker
                key={p.id}
                position={{ lat: p.latitude, lng: p.longitude }}
                title={p.name}
              >
                <div
                  className="size-4 rounded-full border-2 border-white shadow"
                  style={{ background: STATE_COLOR[p.state ?? "GRAY"] }}
                />
              </AdvancedMarker>
            ))}

            {value && (
              <AdvancedMarker
                position={{ lat: value.latitude, lng: value.longitude }}
                draggable={draggableMarker}
                onDragEnd={(e) => {
                  const pos = e.latLng;
                  if (pos && onChange) onChange(pos.lat(), pos.lng());
                }}
                title="This checkpoint"
              >
                <MapPin className="size-8 text-primary drop-shadow" fill="currentColor" />
              </AdvancedMarker>
            )}

            {value && <DistanceLines origin={value} points={points} />}
          </Map>
        </div>
        {onChange && (
          <p className="text-xs text-muted-foreground">
            Search a place, click the map, or drag the pin to set the location.
          </p>
        )}
      </div>
    </APIProvider>
  );
}

/** Places Autocomplete bound to a plain input. */
function PlaceSearch({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const places = useMapsLibrary("places");
  const map = useMap();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name"],
    });
    const listener = autocomplete.addListener("place_changed", () => {
      const loc = autocomplete.getPlace().geometry?.location;
      if (!loc) return;
      onPick(loc.lat(), loc.lng());
      map?.panTo({ lat: loc.lat(), lng: loc.lng() });
    });
    return () => listener.remove();
  }, [places, map, onPick]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input ref={inputRef} placeholder="Search a campus location" className="h-9 pl-9" />
    </div>
  );
}

/** Straight lines to nearby checkpoints, labelled with walking distance. */
function DistanceLines({
  origin,
  points,
}: {
  origin: { latitude: number; longitude: number };
  points: MapPoint[];
}) {
  const map = useMap();
  const maps = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !maps) return;
    const lines = points.map(
      (p) =>
        new maps.Polyline({
          map,
          path: [
            { lat: origin.latitude, lng: origin.longitude },
            { lat: p.latitude, lng: p.longitude },
          ],
          strokeOpacity: 0.35,
          strokeWeight: 2,
        }),
    );
    return () => lines.forEach((l) => l.setMap(null));
  }, [map, maps, origin.latitude, origin.longitude, points]);

  return null;
}

/**
 * Key-free plot: checkpoints scaled into a bounding box so organizers can still
 * see relative positions and set coordinates by clicking.
 */
function FallbackMap({
  value,
  onChange,
  points,
  height,
}: {
  value?: { latitude: number; longitude: number } | null;
  onChange?: (lat: number, lng: number) => void;
  points: MapPoint[];
  height: number;
}) {
  const all = useMemo(
    () => (value ? [...points, { id: "__self", name: "This checkpoint", ...value }] : points),
    [points, value],
  );

  const bounds = useMemo(() => {
    if (all.length === 0) {
      return { minLat: 28.54, maxLat: 28.55, minLng: 77.185, maxLng: 77.2 };
    }
    const lats = all.map((p) => p.latitude);
    const lngs = all.map((p) => p.longitude);
    const pad = 0.0008;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [all]);

  const toPercent = (p: { latitude: number; longitude: number }) => ({
    left: ((p.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100,
    top: (1 - (p.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100,
  });

  const [hint, setHint] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div
        style={{ height }}
        className="relative overflow-hidden rounded-lg border bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:32px_32px]"
        onClick={(e) => {
          if (!onChange) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          const lat = bounds.maxLat - y * (bounds.maxLat - bounds.minLat);
          const lng = bounds.minLng + x * (bounds.maxLng - bounds.minLng);
          onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        }}
      >
        {points.map((p) => {
          const pos = toPercent(p);
          const distance = value ? Math.round(haversine(value, p)) : null;
          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              onMouseEnter={() => setHint(`${p.name}${distance !== null ? ` — ${distance}m` : ""}`)}
              onMouseLeave={() => setHint(null)}
            >
              <div
                className="size-3 rounded-full border-2 border-background shadow"
                style={{ background: STATE_COLOR[p.state ?? "GRAY"] }}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-muted-foreground">
                {p.name}
                {distance !== null && ` · ${distance}m`}
              </span>
            </div>
          );
        })}

        {value && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${toPercent(value).left}%`, top: `${toPercent(value).top}%` }}
          >
            <MapPin className="size-6 text-primary" fill="currentColor" />
          </div>
        )}

        {hint && (
          <p className="absolute bottom-2 left-2 rounded bg-background/90 px-2 py-1 text-xs">
            {hint}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {onChange
          ? "No Google Maps key configured. Click the grid to set coordinates, or type them below."
          : "No Google Maps key configured. Showing relative positions only."}
      </p>
    </div>
  );
}
