/**
 * Headless canary: world advances with no canvas, DOM, or style.
 * Run: npm run smoke
 *
 * Includes an Intent tape — same seed + same intents → same ticks.
 */
import {
  ARENA_COLS,
  ARENA_ROWS,
  blocked,
  createWorld,
  deserialize,
  isEnemy,
  levelOf,
  serialize,
  solidAt,
  step,
  type Intent,
} from "../src/sim/index.ts";

const STEP = 1 / 60;
const EMPTY: Intent = { steerX: 0, steerY: 0, lookYaw: 0, fire: false };

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`sim-smoke FAIL: ${msg}`);
    process.exit(1);
  }
}

const world = createWorld(undefined, undefined, 42);
assert(!!levelOf(world), "missing level entity");
assert(
  world.entities.filter((e) => e.identity === "player").length === 1,
  "expected one player",
);
assert(
  world.entities.filter((e) => e.identity === "drone").length >= 1,
  "expected drones",
);
assert(
  world.entities.filter((e) => e.identity === "stalker").length >= 1,
  "expected stalkers",
);
assert(
  world.entities.every((e) => e.identity !== "target"),
  "legacy target identity must be gone",
);

const level = levelOf(world)!;
assert(level.local?.cols === ARENA_COLS, "expected 24 cols");
assert(level.local?.rows === ARENA_ROWS, "expected 18 rows");
assert(
  (level.local?.cells?.length ?? 0) === ARENA_COLS * ARENA_ROWS,
  "level cells length mismatch",
);
assert(solidAt(world, 0.5, 0.5), "border cell should be solid");
assert(!solidAt(world, 2.5, 2.5), "spawn cell should be empty");
assert(blocked(world, 0.5, 0.5, 0.2), "blocked on solid");

for (let i = 0; i < 120; i++) {
  step(world, STEP, EMPTY);
}

const snap = serialize(world);
const again = createWorld(undefined, undefined, 42);
for (let i = 0; i < 120; i++) {
  step(again, STEP, EMPTY);
}
assert(serialize(again) === snap, "deterministic replay mismatch (empty intent)");

const tape: Intent[] = [];
for (let i = 0; i < 90; i++) {
  tape.push({
    steerX: 0,
    steerY: 1,
    lookYaw: i < 30 ? 0.02 : 0,
    fire: i === 40 || i === 55,
  });
}
for (let i = 0; i < 60; i++) {
  tape.push({ steerX: 0.5, steerY: 0.5, lookYaw: -0.01, fire: false });
}

const taped = createWorld(undefined, undefined, 7);
for (const intent of tape) {
  step(taped, STEP, intent);
}
const tapedSnap = serialize(taped);

const taped2 = createWorld(undefined, undefined, 7);
for (const intent of tape) {
  step(taped2, STEP, intent);
}
assert(serialize(taped2) === tapedSnap, "Intent-tape replay mismatch");

assert(taped.tick === tape.length, "tick should match tape length");
const score =
  taped.entities.find((e) => e.identity === "player")?.local?.score ?? 0;
assert(score >= 0, "score should be present");

const trip = deserialize(serialize(taped));
const tripLevel = levelOf(trip)!;
const srcLevel = levelOf(taped)!;
assert(
  JSON.stringify(tripLevel.local?.cells) ===
    JSON.stringify(srcLevel.local?.cells),
  "level cells lost in snapshot",
);
const tripPlayer = trip.entities.find((e) => e.identity === "player");
const srcPlayer = taped.entities.find((e) => e.identity === "player");
assert(!!tripPlayer && !!srcPlayer, "player missing after trip");
assert(tripPlayer!.x === srcPlayer!.x, "player x lost");
assert(tripPlayer!.facing === srcPlayer!.facing, "player facing lost");
assert(trip.width === taped.width && trip.height === taped.height, "extent lost");

const fireWorld = createWorld(undefined, undefined, 11);
const beforeBolts = fireWorld.entities.filter((e) => e.identity === "bolt")
  .length;
step(fireWorld, STEP, { steerX: 0, steerY: 0, lookYaw: 0, fire: true });
const afterBolts = fireWorld.entities.filter((e) => e.identity === "bolt")
  .length;
assert(afterBolts === beforeBolts + 1, "fire should spawn a bolt");

const enemies = taped.entities.filter((e) => isEnemy(e.identity)).length;
console.log(
  `sim-smoke OK — arena ${ARENA_COLS}x${ARENA_ROWS} tick=${taped.tick} enemies=${enemies} score=${score} (intent tape, no renderer)`,
);
