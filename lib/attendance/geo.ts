export type Coords = { latitude: number; longitude: number; accuracy?: number | null };

/** Great-circle distance in metres. */
export function distanceM(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/**
 * Whether a phone's reported position can be inside the room.
 *
 * Indoors GPS is often 30–80 m off, so the phone's own accuracy estimate
 * widens the radius, capped at 100 m so "accuracy: 5 km" cannot pass anyone.
 * ponytail: phones can fake GPS. This is a second layer behind the rotating
 * code, never the only check.
 */
export function withinRoom(
  room: { latitude: number; longitude: number; radiusM: number },
  at: Coords,
): { ok: boolean; distance: number } {
  const distance = distanceM(room, at);
  const slack = Math.min(Math.max(at.accuracy ?? 0, 0), 100);
  return { ok: distance <= room.radiusM + slack, distance };
}
