/**
 * Headless canary: world advances with no canvas, DOM, or style.
 * Run: npm run smoke
 */
import {
  DAY_SECONDS,
  createWorld,
  dayOf,
  deserialize,
  growthFactor,
  isFoodSource,
  localOf,
  nearestFood,
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
const grasses = world.entities.filter((e) => e.identity === "grass");
const flowers = world.entities.filter((e) => e.identity === "flower");
if (creatures.length < 1) {
  console.error("sim-smoke FAIL: expected creatures in the meadow");
  process.exit(1);
}
if (grasses.length < 40) {
  console.error("sim-smoke FAIL: expected denser grass field");
  process.exit(1);
}
if (flowers.length < 1) {
  console.error("sim-smoke FAIL: expected seeded flowers");
  process.exit(1);
}
if (!dayOf(world)) {
  console.error("sim-smoke FAIL: missing day entity");
  process.exit(1);
}

// Day cycle advances.
const dayWorld = createWorld(800, 600, 3);
const day0 = dayOf(dayWorld)!.local!.cycle!;
step(dayWorld, DAY_SECONDS * 0.25, EMPTY);
const day1 = dayOf(dayWorld)!.local!.cycle!;
const dayDelta = (day1 - day0 + 1) % 1;
if (!(dayDelta > 0.2 && dayDelta < 0.3)) {
  console.error(
    `sim-smoke FAIL: day cycle did not advance (~0.25), got Δ=${dayDelta.toFixed(3)}`,
  );
  process.exit(1);
}

// Growth factor: day clearly faster than night.
const gfDay = createWorld(400, 300, 5);
localOf(dayOf(gfDay)!).cycle = 0.45;
const mid = growthFactor(gfDay);
localOf(dayOf(gfDay)!).cycle = 0.95;
const night = growthFactor(gfDay);
if (!(mid > night * 3)) {
  console.error(
    `sim-smoke FAIL: day growthFactor should dominate night (mid=${mid.toFixed(2)} night=${night.toFixed(2)})`,
  );
  process.exit(1);
}

// Grass regenerates under conditions.
const growWorld = createWorld(400, 300, 9);
const patch = growWorld.entities.find((e) => e.identity === "grass")!;
localOf(patch).amount = 0.1;
localOf(dayOf(growWorld)!).cycle = 0.45;
const a0 = patch.local!.amount!;
for (let i = 0; i < 180; i++) {
  step(growWorld, STEP, EMPTY);
}
if (!((patch.local?.amount ?? 0) > a0 + 0.05)) {
  console.error("sim-smoke FAIL: grass did not regenerate");
  process.exit(1);
}

// Grass spread into a sparse neighbor.
const spreadWorld = createWorld(400, 300, 8);
const rich = spreadWorld.entities.find((e) => e.identity === "grass")!;
localOf(rich).amount = 1;
const sparse = spreadWorld.entities.find(
  (e) => e.identity === "grass" && e.id !== rich.id,
)!;
sparse.x = rich.x + 20;
sparse.y = rich.y;
localOf(sparse).amount = 0.1;
localOf(dayOf(spreadWorld)!).cycle = 0.45;
const s0 = sparse.local!.amount!;
for (let i = 0; i < 240; i++) {
  step(spreadWorld, STEP, EMPTY);
}
if (!((sparse.local?.amount ?? 0) > s0 + 0.04)) {
  console.error("sim-smoke FAIL: grass did not spread to neighbor");
  process.exit(1);
}

// Flower: grow → bloom → wilt die.
const flowerWorld = createWorld(400, 300, 19);
const fl = flowerWorld.entities.find((e) => e.identity === "flower")!;
const flId = fl.id;
localOf(fl).amount = 0.8;
localOf(fl).bloomed = false;
localOf(fl).age = 0;
localOf(dayOf(flowerWorld)!).cycle = 0.45;
for (let i = 0; i < 120; i++) {
  step(flowerWorld, STEP, EMPTY);
}
const midFl = flowerWorld.entities.find((e) => e.id === flId);
if (!midFl?.local?.bloomed) {
  console.error("sim-smoke FAIL: flower should bloom when amount high");
  process.exit(1);
}
for (let i = 0; i < 60 * 16; i++) {
  step(flowerWorld, STEP, EMPTY);
}
if (flowerWorld.entities.some((e) => e.id === flId)) {
  console.error("sim-smoke FAIL: bloomed flower should wilt and die off");
  process.exit(1);
}

// Food helper: grass is edible; flowers are not.
const eatWorld = createWorld(400, 300, 11);
const eater = eatWorld.entities.find((e) => e.identity === "creature")!;
const meal = eatWorld.entities.find((e) => e.identity === "grass")!;
const bloom = eatWorld.entities.find((e) => e.identity === "flower");
meal.x = 200;
meal.y = 200;
localOf(meal).amount = 1;
eater.x = 200;
eater.y = 200;
localOf(eater).fullness = 0.2;
if (bloom && isFoodSource(bloom)) {
  console.error("sim-smoke FAIL: flowers must not be food sources");
  process.exit(1);
}
if (!isFoodSource(meal) || nearestFood(eatWorld, 200, 200)?.id !== meal.id) {
  console.error("sim-smoke FAIL: food source helpers miss grass");
  process.exit(1);
}
const fullness0 = eater.local!.fullness!;
const amount0 = meal.local!.amount!;
step(eatWorld, STEP, EMPTY);
if (
  !((eater.local?.fullness ?? 0) > fullness0) ||
  !((meal.local?.amount ?? 1) < amount0)
) {
  console.error("sim-smoke FAIL: creature did not eat nearby food");
  process.exit(1);
}

// Death when fullness depleted.
const deathWorld = createWorld(400, 300, 13);
const doomed = deathWorld.entities.find((e) => e.identity === "creature")!;
const doomedId = doomed.id;
localOf(doomed).fullness = 0.001;
step(deathWorld, 0.5, EMPTY);
if (deathWorld.entities.some((e) => e.id === doomedId)) {
  console.error("sim-smoke FAIL: creature should die at zero fullness");
  process.exit(1);
}

// Birth when fullness high and cooldown clear.
const birthWorld = createWorld(400, 300, 17);
const parent = birthWorld.entities.find((e) => e.identity === "creature")!;
const before = birthWorld.entities.filter((e) => e.identity === "creature")
  .length;
localOf(parent).fullness = 0.95;
localOf(parent).age = 20;
localOf(parent).cooldown = 0;
step(birthWorld, STEP, EMPTY);
const after = birthWorld.entities.filter((e) => e.identity === "creature")
  .length;
if (!(after > before)) {
  console.error("sim-smoke FAIL: creature should reproduce when able");
  process.exit(1);
}

const trip = deserialize(serialize(birthWorld));
const tripParent = trip.entities.find((e) => e.id === parent.id);
if (
  !tripParent ||
  tripParent.local?.fullness !== parent.local?.fullness ||
  (dayOf(trip)?.local?.cycle ?? -1) !== (dayOf(birthWorld)?.local?.cycle ?? -2)
) {
  console.error("sim-smoke FAIL: ecology state lost in snapshot");
  process.exit(1);
}

const extentTrip = deserialize(serialize(createWorld(960, 600, 2)));
if (extentTrip.width !== 960 || extentTrip.height !== 600) {
  console.error("sim-smoke FAIL: world extent lost on deserialize");
  process.exit(1);
}

console.log(
  `sim-smoke OK — meadow tick=${world.tick} creatures=${creatures.length} grass=${grasses.length} flowers=${flowers.length} day=${(dayOf(world)?.local?.cycle ?? 0).toFixed(2)} (empty intent, no renderer)`,
);
