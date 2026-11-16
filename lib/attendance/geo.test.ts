import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceM, withinRoom } from "./geo";

const room = { latitude: 12.9716, longitude: 77.5946, radiusM: 50 };

test("distance is about 111 m per 0.001° of latitude", () => {
  const d = distanceM(room, { latitude: 12.9726, longitude: 77.5946 });
  assert.ok(d > 105 && d < 117, `got ${d}`);
});

test("inside the radius passes, outside fails", () => {
  assert.equal(withinRoom(room, { latitude: 12.9718, longitude: 77.5946 }).ok, true); // ~22 m
  assert.equal(withinRoom(room, { latitude: 12.9726, longitude: 77.5946 }).ok, false); // ~111 m
});

test("reported accuracy widens the radius, capped at 100 m", () => {
  const far = { latitude: 12.9726, longitude: 77.5946 }; // ~111 m
  assert.equal(withinRoom(room, { ...far, accuracy: 70 }).ok, true);
  const veryFar = { latitude: 12.9736, longitude: 77.5946 }; // ~222 m
  assert.equal(withinRoom(room, { ...veryFar, accuracy: 5000 }).ok, false);
});
