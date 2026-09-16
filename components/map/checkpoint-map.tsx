"use client";

import { useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TRAFFIC_FILL } from "@/lib/routing/traffic-presentation";
import { OsmMap } from "./osm-map";

export type MapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Colour band for the live map; defaults to neutral. */
  state?: "GREEN" | "YELLOW" | "RED" | "GRAY";
};

// Colour comes from the status tokens, never a literal, so light and dark
// stay in step. Shape varies too: colour alone is a weak signal here because
// the brand is lime. See the colour rules in app/globals.css.
const STATE_COLOR = TRAFFIC_FILL;

/** Square for congested, ring for approaching, dot otherwise. */
const STATE_SHAPE: Record<string, string> = {
  GREEN: "rounded-full",
  YELLOW: "rounded-full ring-2 ring-offset-1",
  RED: "rounded-[2px]",
  GRAY: "rounded-full opacity-70",
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
  // Without a key the whole Google stack is skipped and OpenStreetMap is used,
  // which needs no key. Same contract either way: click or drag sets coordinates.
  if (!apiKey) {
    return <OsmMap value={value} onChange={onChange} points={points} height={height} />;
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
                  className={`size-4 border-2 border-white shadow ${STATE_SHAPE[p.state ?? "GRAY"]}`}
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
                <MapPin className="size-8 text-primary-strong drop-shadow" fill="currentColor" />
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

