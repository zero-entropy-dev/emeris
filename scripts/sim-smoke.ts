/**
 * Headless canary: simulation advances with no canvas, DOM, or style.
 * Run: npm run smoke
 */
import {
  FLOWER_REGROW_SECONDS,
  createWorld,
  deserialize,
  gardenComplete,
  localOf,
  serialize,
  step,
  type Intent,
} from "../src/sim/index.ts";

const STEP = 1 / 60;
const world = createWorld(800, 600, 42);

const intents: Intent[] = [
  { steerX: 1, steerY: 0 },
  { steerX: 1, steerY: -0.5 },
  { steerX: 0, steerY: -1 },
  { steerX: 0, steerY: 0, cycleControl: true },
  { steerX: -1, steerY: 0 },
];

for (let i = 0; i < 120; i++) {
  step(world, STEP, intents[i % intents.length]!);
}

const snap = serialize(world);
const again = createWorld(800, 600, 42);
for (let i = 0; i < 120; i++) {
  step(again, STEP, intents[i % intents.length]!);
}

if (serialize(again) !== snap) {
  console.error("sim-smoke FAIL: deterministic replay mismatch");
  process.exit(1);
}

const critters = world.entities.filter((e) => e.identity === "critter");
if (critters.length < 1) {
  console.error("sim-smoke FAIL: expected critters in the meadow");
  process.exit(1);
}

// Flee: park a walker next to a critter; distance should grow.
const fleeWorld = createWorld(800, 600, 7);
const critter = fleeWorld.entities.find((e) => e.identity === "critter");
const walker = fleeWorld.entities.find((e) => e.id === fleeWorld.controlledId);
if (!critter || !walker) {
  console.error("sim-smoke FAIL: missing critter or controlled walker");
  process.exit(1);
}
critter.x = 400;
critter.y = 300;
localOf(critter).alarm = 0;
walker.x = 430;
walker.y = 300;
const d0 = Math.hypot(critter.x - walker.x, critter.y - walker.y);
for (let i = 0; i < 45; i++) {
  step(fleeWorld, STEP, { steerX: 0, steerY: 0 });
}
const d1 = Math.hypot(critter.x - walker.x, critter.y - walker.y);
if (!(d1 > d0 + 8)) {
  console.error(
    `sim-smoke FAIL: critter did not flee (d0=${d0.toFixed(1)} d1=${d1.toFixed(1)})`,
  );
  process.exit(1);
}

// Startle memory: after walker teleports away, critter keeps moving while alarm > 0.
const memoryWorld = createWorld(800, 600, 11);
const mCritter = memoryWorld.entities.find((e) => e.identity === "critter");
const mWalker = memoryWorld.entities.find(
  (e) => e.id === memoryWorld.controlledId,
);
if (!mCritter || !mWalker) {
  console.error("sim-smoke FAIL: missing entities for alarm probe");
  process.exit(1);
}
mCritter.x = 400;
mCritter.y = 300;
mCritter.facing = 0;
localOf(mCritter).alarm = 0;
mWalker.x = 420;
mWalker.y = 300;
step(memoryWorld, STEP, { steerX: 0, steerY: 0 });
if (!((mCritter.local?.alarm ?? 0) > 0)) {
  console.error("sim-smoke FAIL: startle did not set alarm");
  process.exit(1);
}
mWalker.x = 50;
mWalker.y = 50;
const xBefore = mCritter.x;
const yBefore = mCritter.y;
const alarmBefore = mCritter.local?.alarm ?? 0;
for (let i = 0; i < 20; i++) {
  step(memoryWorld, STEP, { steerX: 0, steerY: 0 });
}
const moved = Math.hypot(mCritter.x - xBefore, mCritter.y - yBefore);
if (!(moved > 2)) {
  console.error(
    "sim-smoke FAIL: skittish critter did not keep moving after threat left",
  );
  process.exit(1);
}
if (!((mCritter.local?.alarm ?? 0) < alarmBefore)) {
  console.error("sim-smoke FAIL: alarm did not decay");
  process.exit(1);
}

// Snapshot round trip preserves critter pose + local.alarm (plain JSON).
const roundTrip = deserialize(serialize(memoryWorld));
const rtCritter = roundTrip.entities.find((e) => e.id === mCritter.id);
if (!rtCritter || rtCritter.identity !== "critter") {
  console.error("sim-smoke FAIL: critter missing after deserialize");
  process.exit(1);
}
if (
  rtCritter.x !== mCritter.x ||
  rtCritter.y !== mCritter.y ||
  rtCritter.local?.alarm !== mCritter.local?.alarm
) {
  console.error("sim-smoke FAIL: critter state lost in snapshot round trip");
  process.exit(1);
}

// Flower: permanent bloom latch + snapshot round trip.
const bloomWorld = createWorld(800, 600, 19);
const flower = bloomWorld.entities.find((e) => e.identity === "flower");
const fWalker = bloomWorld.entities.find(
  (e) => e.id === bloomWorld.controlledId,
);
if (!flower || !fWalker) {
  console.error("sim-smoke FAIL: missing flower or walker");
  process.exit(1);
}
if (flower.local?.bloomed) {
  console.error("sim-smoke FAIL: flower should start unbloomed");
  process.exit(1);
}
flower.x = 400;
flower.y = 300;
fWalker.x = 410;
fWalker.y = 300;
step(bloomWorld, STEP, { steerX: 0, steerY: 0 });
if (!flower.local?.bloomed) {
  console.error("sim-smoke FAIL: flower did not bloom on visit");
  process.exit(1);
}
fWalker.x = 50;
fWalker.y = 50;
for (let i = 0; i < 30; i++) {
  step(bloomWorld, STEP, { steerX: 0, steerY: 0 });
}
if (!flower.local?.bloomed) {
  console.error("sim-smoke FAIL: bloom latch did not persist after walker left");
  process.exit(1);
}
const bloomTrip = deserialize(serialize(bloomWorld));
const rtFlower = bloomTrip.entities.find((e) => e.id === flower.id);
if (!rtFlower || rtFlower.local?.bloomed !== true) {
  console.error("sim-smoke FAIL: bloomed state lost in snapshot round trip");
  process.exit(1);
}

// World control probe: second command source claims a walker via Intent only.
const controlWorld = createWorld(800, 600, 23);
const walkers = controlWorld.entities.filter((e) => e.identity === "walker");
if (walkers.length < 2) {
  console.error("sim-smoke FAIL: need at least two walkers for control probe");
  process.exit(1);
}
const a = walkers[0]!;
const b = walkers[1]!;
controlWorld.controlledId = a.id;
a.x = 200;
a.y = 300;
b.x = 400;
b.y = 300;
const aX0 = a.x;
// Source A steers the current controlled walker right.
for (let i = 0; i < 30; i++) {
  step(controlWorld, STEP, { steerX: 1, steerY: 0 });
}
if (!(a.x > aX0 + 5)) {
  console.error("sim-smoke FAIL: source A did not move controlled walker A");
  process.exit(1);
}
const aX1 = a.x;
const bX1 = b.x;
// Source B claims walker B and steers left — no new World fields.
for (let i = 0; i < 30; i++) {
  step(controlWorld, STEP, {
    steerX: -1,
    steerY: 0,
    claimControl: b.id,
  });
}
if (controlWorld.controlledId !== b.id) {
  console.error("sim-smoke FAIL: claimControl did not set controlledId");
  process.exit(1);
}
if (!(b.x < bX1 - 5)) {
  console.error("sim-smoke FAIL: source B did not move claimed walker B");
  process.exit(1);
}
// A may wander slightly but must not keep receiving source B's leftward steer.
if (a.x < aX1 - 40) {
  console.error("sim-smoke FAIL: walker A still looked claimed after B took control");
  process.exit(1);
}
const controlTrip = deserialize(serialize(controlWorld));
if (controlTrip.controlledId !== b.id) {
  console.error("sim-smoke FAIL: controlledId lost in snapshot round trip");
  process.exit(1);
}

// Movement feel: accelerate under steer, coast after release (Entity.local vx/vy).
const feelWorld = createWorld(800, 600, 29);
const feel = feelWorld.entities.find((e) => e.id === feelWorld.controlledId);
if (!feel) {
  console.error("sim-smoke FAIL: missing controlled walker for feel probe");
  process.exit(1);
}
feel.x = 200;
feel.y = 300;
localOf(feel).vx = 0;
localOf(feel).vy = 0;
for (let i = 0; i < 45; i++) {
  step(feelWorld, STEP, { steerX: 1, steerY: 0 });
}
if (!(feel.x > 200 + 20)) {
  console.error("sim-smoke FAIL: walker did not accelerate under steer");
  process.exit(1);
}
if (!((feel.local?.vx ?? 0) > 10)) {
  console.error("sim-smoke FAIL: expected nonzero vx while steering");
  process.exit(1);
}
const coastX0 = feel.x;
const coastVx0 = feel.local?.vx ?? 0;
step(feelWorld, STEP, { steerX: 0, steerY: 0 });
step(feelWorld, STEP, { steerX: 0, steerY: 0 });
if (!(feel.x > coastX0)) {
  console.error("sim-smoke FAIL: walker did not coast after releasing steer");
  process.exit(1);
}
if (!((feel.local?.vx ?? 0) < coastVx0)) {
  console.error("sim-smoke FAIL: friction did not reduce vx while coasting");
  process.exit(1);
}

// Garden gate: beacon win blocked until bloom goal met.
const gateWorld = createWorld(800, 600, 31);
const gPlayer = gateWorld.entities.find((e) => e.id === gateWorld.controlledId);
const gBeacon = gateWorld.entities.find((e) => e.identity === "beacon");
const gFlowers = gateWorld.entities.filter((e) => e.identity === "flower");
if (!gPlayer || !gBeacon || gFlowers.length < 1) {
  console.error("sim-smoke FAIL: missing pieces for garden gate");
  process.exit(1);
}
gPlayer.x = gBeacon.x;
gPlayer.y = gBeacon.y;
step(gateWorld, STEP, { steerX: 0, steerY: 0 });
if (gateWorld.phase === "won") {
  console.error("sim-smoke FAIL: won before garden complete");
  process.exit(1);
}
if (gardenComplete(gateWorld)) {
  console.error("sim-smoke FAIL: garden should start incomplete");
  process.exit(1);
}
for (const f of gFlowers) {
  localOf(f).bloomed = true;
  gateWorld.flowerBloomed += 1;
}
if (!gardenComplete(gateWorld)) {
  console.error("sim-smoke FAIL: gardenComplete false after blooming all");
  process.exit(1);
}
step(gateWorld, STEP, { steerX: 0, steerY: 0 });
if (gateWorld.phase !== "won") {
  console.error("sim-smoke FAIL: should win when garden full and on beacon");
  process.exit(1);
}

// Lifecycle: gather despawns a bloomed flower; counters + snapshot survive.
const lifeWorld = createWorld(800, 600, 37);
const lifeFlower = lifeWorld.entities.find((e) => e.identity === "flower");
const lifePlayer = lifeWorld.entities.find(
  (e) => e.id === lifeWorld.controlledId,
);
if (!lifeFlower || !lifePlayer) {
  console.error("sim-smoke FAIL: missing flower/player for lifecycle");
  process.exit(1);
}
const beforeCount = lifeWorld.entities.length;
lifeFlower.x = 300;
lifeFlower.y = 300;
lifePlayer.x = 300;
lifePlayer.y = 300;
step(lifeWorld, STEP, { steerX: 0, steerY: 0 }); // bloom
if (!lifeFlower.local?.bloomed || lifeWorld.flowerBloomed < 1) {
  console.error("sim-smoke FAIL: flower did not bloom for gather probe");
  process.exit(1);
}
step(lifeWorld, STEP, { steerX: 0, steerY: 0 }); // gather / despawn + queue
if (lifeWorld.entities.some((e) => e.id === lifeFlower.id)) {
  console.error("sim-smoke FAIL: gathered flower still in entities");
  process.exit(1);
}
if (lifeWorld.entities.length !== beforeCount - 1) {
  console.error("sim-smoke FAIL: entity count did not drop after gather");
  process.exit(1);
}
if (lifeWorld.flowerGathered < 1) {
  console.error("sim-smoke FAIL: flowerGathered not incremented");
  process.exit(1);
}
if ((lifeWorld.flowerRegrows?.length ?? 0) !== 1) {
  console.error("sim-smoke FAIL: gather should queue one flowerRegrow");
  process.exit(1);
}
const queued = lifeWorld.flowerRegrows[0]!;
const midTrip = deserialize(serialize(lifeWorld));
if (
  midTrip.flowerRegrows?.length !== 1 ||
  midTrip.flowerRegrows[0]!.readyAt !== queued.readyAt
) {
  console.error("sim-smoke FAIL: flowerRegrows lost in snapshot");
  process.exit(1);
}
// Spawn under play: advance past readyAt → bud returns via addEntity.
const spawnId = lifeWorld.nextId;
step(lifeWorld, FLOWER_REGROW_SECONDS, { steerX: 0, steerY: 0 });
if ((lifeWorld.flowerRegrows?.length ?? 0) !== 0) {
  console.error("sim-smoke FAIL: due regrow was not flushed");
  process.exit(1);
}
if (lifeWorld.entities.length !== beforeCount) {
  console.error("sim-smoke FAIL: entity count did not recover after regrow");
  process.exit(1);
}
const regrown = lifeWorld.entities.find((e) => e.id === spawnId);
if (!regrown || regrown.identity !== "flower" || regrown.local?.bloomed) {
  console.error("sim-smoke FAIL: expected unbloomed flower from addEntity");
  process.exit(1);
}
// Garden can complete even after flowers are gone, via bloom counters.
lifeWorld.flowerBloomed = lifeWorld.flowerGoal;
if (!gardenComplete(lifeWorld)) {
  console.error("sim-smoke FAIL: gardenComplete should use bloom counters");
  process.exit(1);
}
const lifeTrip = deserialize(serialize(lifeWorld));
if (
  lifeTrip.entities.length !== lifeWorld.entities.length ||
  lifeTrip.flowerGathered !== lifeWorld.flowerGathered ||
  lifeTrip.flowerBloomed !== lifeWorld.flowerBloomed ||
  (lifeTrip.flowerRegrows?.length ?? 0) !==
    (lifeWorld.flowerRegrows?.length ?? 0)
) {
  console.error("sim-smoke FAIL: lifecycle state lost in snapshot");
  process.exit(1);
}

// deserialize must preserve world extent (viewport is host-only).
const extentTrip = deserialize(serialize(createWorld(2200, 1500, 2)));
if (extentTrip.width !== 2200 || extentTrip.height !== 1500) {
  console.error("sim-smoke FAIL: meadow extent lost on deserialize");
  process.exit(1);
}

const flowers = world.entities.filter((e) => e.identity === "flower");
console.log(
  `sim-smoke OK — tick=${world.tick} phase=${world.phase} entities=${world.entities.length} critters=${critters.length} flowers=${flowers.length} fleeΔ=${(d1 - d0).toFixed(1)} claim→${b.id} coast gate life spawn (no renderer)`,
);
