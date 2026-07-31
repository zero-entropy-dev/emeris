/**
 * Headless canary: world advances with no canvas, DOM, or style.
 * Run: npm run smoke
 */
import {
  createWorld,
  deserialize,
  serialize,
  step,
} from "../src/sim/index.ts";

const STEP = 1 / 60;
const EMPTY = { steerX: 0, steerY: 0 };

const world = createWorld(800, 600, 42);

for (let i = 0; i < 120; i++) {
  step(world, STEP, EMPTY);
}

const snap = serialize(world);
const again = createWorld(800, 600, 42);
for (let i = 0; i < 120; i++) {
  step(again, STEP, EMPTY);
}

if (serialize(again) !== snap) {
  console.error("sim-smoke FAIL: deterministic replay mismatch");
  process.exit(1);
}

const creatures = world.entities.filter((e) => e.identity === "creature");
const landmarks = world.entities.filter((e) => e.identity === "landmark");
if (creatures.length < 1) {
  console.error("sim-smoke FAIL: expected creatures in blank world");
  process.exit(1);
}
if (landmarks.length < 1) {
  console.error("sim-smoke FAIL: expected landmarks in blank world");
  process.exit(1);
}

const moved = createWorld(400, 300, 7);
const mote = moved.entities.find((e) => e.identity === "creature")!;
const x0 = mote.x;
const y0 = mote.y;
for (let i = 0; i < 180; i++) {
  step(moved, STEP, EMPTY);
}
const moteNow = moved.entities.find((e) => e.id === mote.id)!;
const travel = Math.hypot(moteNow.x - x0, moteNow.y - y0);
if (!(travel > 5)) {
  console.error("sim-smoke FAIL: creature should wander");
  process.exit(1);
}

const trip = deserialize(serialize(world));
if (trip.width !== world.width || trip.entities.length !== world.entities.length) {
  console.error("sim-smoke FAIL: snapshot round-trip lost state");
  process.exit(1);
}

console.log(
  `sim-smoke OK — blank tick=${world.tick} creatures=${creatures.length} landmarks=${landmarks.length} travel=${travel.toFixed(1)} (empty intent, no renderer)`,
);
