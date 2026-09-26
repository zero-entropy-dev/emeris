/**
 * Headless canary: world advances with no canvas, DOM, or style.
 * Run: npm run smoke
 *
 * Includes an Intent tape — same seed + same intents → same ticks.
 */
import {
  ARENA_COLS,
  ARENA_ROWS,
  WAVE_BREATHER,
  blocked,
  addEntity,
  createWorld,
  deserialize,
  isEnemy,
  levelOf,
  removeEntity,
  serialize,
  solidAt,
  spawnEnemy,
  step,
  waveDrones,
  waveOf,
  waveStalkers,
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
assert(!!waveOf(world), "missing wave entity");
assert(
  world.entities.every((e) => !isEnemy(e.identity)),
  "enemies should wait for wave 1",
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
const spawns = level.local?.spawns ?? [];
assert(spawns.length >= 4 && spawns.length % 2 === 0, "expected spawn points");
for (let i = 0; i < spawns.length; i += 2) {
  assert(
    !blocked(world, spawns[i]!, spawns[i + 1]!, 0.3),
    `spawn ${i / 2} should be open`,
  );
}

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

const bruise = createWorld(undefined, undefined, 3);
const bruisePlayer = bruise.entities.find((e) => e.identity === "player")!;
const bruiseStalker = spawnEnemy(bruise, "stalker", 3, 2.5);
const healthBefore = bruisePlayer.local?.health ?? 0;
bruiseStalker.x = bruisePlayer.x + 0.35;
bruiseStalker.y = bruisePlayer.y;
if (bruiseStalker.local) bruiseStalker.local.attack = 0;
step(bruise, STEP, EMPTY);
assert(
  (bruisePlayer.local?.health ?? 0) === healthBefore - 1,
  "stalker contact should lower health",
);
assert((bruisePlayer.local?.hurt ?? 0) > 0, "hurt timer should start");

const dying = createWorld(undefined, undefined, 4);
const dyingPlayer = dying.entities.find((e) => e.identity === "player")!;
const killer = spawnEnemy(dying, "stalker", 3, 2.5);
if (dyingPlayer.local) dyingPlayer.local.health = 1;
killer.x = dyingPlayer.x;
killer.y = dyingPlayer.y + 0.3;
if (killer.local) killer.local.attack = 0;
step(dying, STEP, EMPTY);
assert((dyingPlayer.local?.health ?? 1) <= 0, "health should reach 0");
const frozenX = dyingPlayer.x;
const frozenFacing = dyingPlayer.facing;
const boltsOf = (w: typeof dying) =>
  w.entities.filter((e) => e.identity === "bolt").length;
const boltsAtDeath = boltsOf(dying);
step(dying, STEP, { steerX: 0, steerY: 1, lookYaw: 0.4, fire: true });
assert(dyingPlayer.x === frozenX, "dead player should not move");
assert(dyingPlayer.facing === frozenFacing, "dead player should not turn");
assert(boltsOf(dying) === boltsAtDeath, "dead player should not fire");

const gun = createWorld(undefined, undefined, 9);
step(gun, STEP, { steerX: 0, steerY: 0, lookYaw: 0, fire: true });
const gunner = gun.entities.find((e) => e.identity === "player")!;
let guard = 0;
while ((gunner.local?.cooldown ?? 0) > 0.08 && guard < 40) {
  step(gun, STEP, EMPTY);
  guard += 1;
}
assert((gunner.local?.cooldown ?? 0) > 0, "tap should land while still cooling");
const held = gun.entities.filter((e) => e.identity === "bolt").length;
step(gun, STEP, { steerX: 0, steerY: 0, lookYaw: 0, fire: true });
assert(
  gun.entities.filter((e) => e.identity === "bolt").length === held,
  "fire during cooldown should wait",
);
let released = false;
guard = 0;
while (!released && guard < 40) {
  const seen = new Set(
    gun.entities.filter((e) => e.identity === "bolt").map((e) => e.id),
  );
  step(gun, STEP, EMPTY);
  guard += 1;
  released = gun.entities.some(
    (e) => e.identity === "bolt" && !seen.has(e.id),
  );
}
assert(released, "buffered fire should release when cooldown ends");

const fight = createWorld(undefined, undefined, 5);
const tough = spawnEnemy(fight, "stalker", 20.5, 15.5);
assert((tough.local?.health ?? 0) === 3, "stalker should start at 3 health");
for (let hit = 0; hit < 2; hit++) {
  const beforeX = tough.x;
  addEntity(fight, {
    identity: "bolt",
    x: tough.x,
    y: tough.y,
    facing: 0,
    speed: 9,
    local: { age: 0 },
  });
  step(fight, STEP, EMPTY);
  assert(
    fight.entities.some((e) => e.id === tough.id),
    "stalker should survive the first two hits",
  );
  assert(
    (tough.local?.health ?? 0) === 2 - hit,
    "stalker health should fall by one per hit",
  );
  assert(tough.x > beforeX + 0.2, "a hit should knock the stalker back");
}
addEntity(fight, {
  identity: "bolt",
  x: tough.x,
  y: tough.y,
  facing: 0,
  speed: 9,
  local: { age: 0 },
});
step(fight, STEP, EMPTY);
assert(
  !fight.entities.some((e) => e.id === tough.id),
  "third hit should remove the stalker",
);
assert(
  (fight.entities.find((e) => e.identity === "player")?.local?.score ?? 0) ===
    1,
  "score should count the kill",
);

const countOf = (w: typeof world, id: string) =>
  w.entities.filter((e) => e.identity === id).length;

const run = createWorld(undefined, undefined, 21);
const runner = run.entities.find((e) => e.identity === "player")!;
if (runner.local) runner.local.health = 1e6;
const runWave = waveOf(run)!;
guard = 0;
while (
  !(
    runWave.local?.wave === 1 &&
    (runWave.local?.pending ?? 0) + (runWave.local?.pendingStalkers ?? 0) === 0
  ) &&
  guard < 1200
) {
  step(run, STEP, EMPTY);
  guard += 1;
}
assert(runWave.local?.wave === 1, "wave 1 should start");
assert(countOf(run, "drone") === waveDrones(1), "wave 1 drone count");
assert(countOf(run, "stalker") === waveStalkers(1), "wave 1 stalker count");

for (const e of [...run.entities]) {
  if (isEnemy(e.identity)) removeEntity(run, e.id);
}
step(run, STEP, EMPTY);
assert(
  (runWave.local?.breather ?? 0) > WAVE_BREATHER - 0.1,
  "clearing a wave should start the breather",
);
for (let i = 0; i < Math.ceil(WAVE_BREATHER / STEP) + 2; i++) {
  step(run, STEP, EMPTY);
}
assert(runWave.local?.wave === 2, "wave 2 should follow the breather");
const wave2Total =
  countOf(run, "drone") +
  countOf(run, "stalker") +
  (runWave.local?.pending ?? 0) +
  (runWave.local?.pendingStalkers ?? 0);
assert(
  wave2Total === waveDrones(2) + waveStalkers(2),
  "wave 2 should be bigger",
);
assert(wave2Total > waveDrones(1) + waveStalkers(1), "waves should grow");

const range = createWorld(undefined, undefined, 13);
const target = range.entities.find((e) => e.identity === "player")!;
const shooter = spawnEnemy(range, "drone", 5.2, 2.5);
if (shooter.local) shooter.local.attack = 0;
shooter.speed = 0;
guard = 0;
while ((target.local?.health ?? 0) === 5 && guard < 180) {
  step(range, STEP, EMPTY);
  guard += 1;
}
assert((target.local?.health ?? 0) === 4, "a drone shot should lower health");

const wall = createWorld(undefined, undefined, 17);
const safe = wall.entities.find((e) => e.identity === "player")!;
addEntity(wall, {
  identity: "shot",
  x: 5.5,
  y: 5.5,
  facing: 0,
  speed: 4.5,
  local: { age: 0 },
});
for (let i = 0; i < 30; i++) step(wall, STEP, EMPTY);
assert(countOf(wall, "shot") === 0, "a wall should stop a shot");
assert((safe.local?.health ?? 0) === 5, "a stopped shot should not hurt");

const trip2 = deserialize(serialize(run));
assert(serialize(trip2) === serialize(run), "wave state should survive a snapshot");

const enemies = taped.entities.filter((e) => isEnemy(e.identity)).length;
console.log(
  `sim-smoke OK — arena ${ARENA_COLS}x${ARENA_ROWS} tick=${taped.tick} enemies=${enemies} score=${score} (intent tape, no renderer)`,
);
