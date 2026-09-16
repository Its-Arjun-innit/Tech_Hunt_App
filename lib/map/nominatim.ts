/**
 * Geocoding utilities using Nominatim (OpenStreetMap's free geocoder).
 *
 * Usage:
 *   const location = await geocodeAddress("Indian Institute of Technology Delhi");
 *   const colleges = await searchCampus("BITS Pilani");
 */

export type GeocodedLocation = {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  boundingBox?: [number, number, number, number];
};

/**
 * Geocode a freeform address string using Nominatim.
 * Rate-limited to 1 request per second per Nominatim's usage policy.
 */
export async function geocodeAddress(
  query: string,
  options?: { countryCodes?: string[]; limit?: number },
): Promise<GeocodedLocation[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(options?.limit ?? 5),
  });
  if (options?.countryCodes?.length) {
    params.set("countrycodes", options.countryCodes.join(","));
  }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "CampusTreasureHunt/1.0 (https://github.com/campus-hunt)",
    },
  });

  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const data = await res.json();
  return data.map((item: Record<string, unknown>) => ({
    name: item.display_name?.toString().split(",")[0] ?? "",
    displayName: item.display_name?.toString() ?? "",
    latitude: parseFloat(item.lat?.toString() ?? "0"),
    longitude: parseFloat(item.lon?.toString() ?? "0"),
    boundingBox: item.boundingbox
      ? (item.boundingbox as string[]).map(Number) as [number, number, number, number]
      : undefined,
  }));
}

/**
 * Search for a campus/college by name and return its location.
 */
export async function searchCampus(
  name: string,
): Promise<GeocodedLocation[]> {
  return geocodeAddress(name, { limit: 5 });
}

/**
 * Fetch nearby points of interest from OpenStreetMap (Overpass API).
 * Useful for discovering campus buildings, landmarks, etc.
 */
export async function fetchNearbyPOIs(
  latitude: number,
  longitude: number,
  radiusMeters: number = 500,
  tags?: { key: string; value?: string }[],
): Promise<{
  name: string;
  latitude: number;
  longitude: number;
  tags: Record<string, string>;
}[]> {
  const tagFilters = tags?.length
    ? tags.map((t) => (t.value ? `["${t.key}"="${t.value}"]` : `[${t.key}]`)).join("")
    : "";

  const query = `
    [out:json][timeout:10];
    (
      node${tagFilters}(${latitude - radiusMeters / 111320},${longitude - radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180))},${latitude + radiusMeters / 111320},${longitude + radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180))});
      way${tagFilters}(${latitude - radiusMeters / 111320},${longitude - radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180))},${latitude + radiusMeters / 111320},${longitude + radiusMeters / (111320 * Math.cos((latitude * Math.PI) / 180))});
    );
    out center;
  `;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    headers: { "User-Agent": "CampusTreasureHunt/1.0" },
  });

  if (!res.ok) throw new Error(`Overpass query failed: ${res.status}`);

  const data = await res.json();
  return data.elements.map((el: {
    tags?: Record<string, string>;
    lat?: number;
    lon?: number;
    center?: { lat?: number; lon?: number };
  }) => ({
    name: el.tags?.name ?? el.tags?.["name:en"] ?? "Unnamed",
    latitude: el.lat ?? el.center?.lat ?? 0,
    longitude: el.lon ?? el.center?.lon ?? 0,
    tags: el.tags ?? {},
  }));
}

/**
 * Reverse geocode: get address from coordinates.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "User-Agent": "CampusTreasureHunt/1.0" },
  });

  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);

  const data = await res.json();
  return data.display_name ?? "";
}
