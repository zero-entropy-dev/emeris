/**
 * Meadow identities — what something *is*, and how it acts.
 * Couplings live in behave (and tiny domain helpers like growthFactor),
 * not inside caller-blind state transforms.
 */

import { random } from "./rng";
import type { ProcessDef } from "./process";
import {
  addEntity,
  localOf,
  removeEntity,
  type Entity,
  type EntityLocal,
  type World,
} from "./world";

/** Extensible semantic identity — what something *is*, not how it looks. */
export type Identity = string;

export type IdentityDef = {
  id: Identity;
  /** What this is, in words. For you, and for an AI reading the world. */
  describes: string;
  /** How it acts each tick. Absent means inert. */
  behave?: (e: Entity, world: World, dt: number) => void;
  /**
   * Described process — optional alternate to behave.
   * Not a sixth core name: still Identity acting.
   */
  process?: ProcessDef;
};

/** Numeric locals the state transforms may touch. */
export type LocalNumber =
  | "cycle"
  | "amount"
  | "fullness"
  | "age"
  | "cooldown"
  | "pc";

/**
 * Caller-blind state transforms — tiny composable ops on Entity.local.
 * They must not know why they are called; Identity supplies meaning.
 * Not core vocabulary names.
 */

/** Increase a numeric local toward ceil. Returns the new value. */
export function store(
  e: Entity,
  key: LocalNumber,
  delta: number,
  ceil = Infinity,
): number {
  const L = localOf(e);
  const next = Math.min(ceil, (L[key] ?? 0) + Math.max(0, delta));
  L[key] = next;
  return next;
}

/** Decrease a numeric local toward floor. Returns how much was taken. */
export function decay(
  e: Entity,
  key: LocalNumber,
  delta: number,
  floor = 0,
): number {
  const L = localOf(e);
  const cur = L[key] ?? 0;
  const taken = Math.min(Math.max(0, delta), Math.max(0, cur - floor));
  L[key] = cur - taken;
  return taken;
}

/** Push a new entity into the world. */
export function emit(world: World, draft: Omit<Entity, "id">): Entity;
/** Push a numeric delta onto another entity's local. Returns its new value. */
export function emit(
  target: Entity,
  key: LocalNumber,
  delta: number,
  ceil?: number,
): number;
export function emit(
  a: World | Entity,
  b: Omit<Entity, "id"> | LocalNumber,
  delta?: number,
  ceil = Infinity,
): Entity | number {
  if (typeof b === "string") {
    return store(a as Entity, b, delta ?? 0, ceil);
  }
  return addEntity(a as World, b);
}

/** Remap a numeric local in place. Returns the new value. */
export function transform(
  e: Entity,
  key: LocalNumber,
  map: (current: number, local: EntityLocal) => number,
): number {
  const L = localOf(e);
  const next = map(L[key] ?? 0, L);
  L[key] = next;
  return next;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function keepInBounds(e: Entity, world: World): void {
  const pad = 40;
  if (e.x < pad || e.x > world.width - pad) {
    e.facing = Math.PI - e.facing;
    e.x = clamp(e.x, pad, world.width - pad);
  }
  if (e.y < pad || e.y > world.height - pad) {
    e.facing = -e.facing;
    e.y = clamp(e.y, pad, world.height - pad);
  }
}

/** Day entity — continuous cycle 0..1 (not a win state). */
export function dayOf(world: World): Entity | undefined {
  return world.entities.find((e) => e.identity === "day");
}

/** Seconds for a full day→night cycle. */
export const DAY_SECONDS = 90;

/**
 * Meadow growth conditions. Plants do not know about day —
 * this helper is where the meadow couples daylight to regeneration.
 * Night is near-stalled; day is clearly faster.
 */
export function growthFactor(world: World): number {
  const cycle = dayOf(world)?.local?.cycle ?? 0.5;
  const daylight = Math.max(0, Math.sin(cycle * Math.PI * 2 - Math.PI / 2));
  return 0.05 + daylight * 1.35;
}

/** True when this entity can be eaten right now. Today: grass with amount. */
export function isFoodSource(e: Entity): boolean {
  return e.identity === "grass" && (e.local?.amount ?? 0) > 0.05;
}

/** Nearest edible entity to a point — food sources, not hard-coded grass. */
export function nearestFood(
  world: World,
  x: number,
  y: number,
): Entity | undefined {
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const e of world.entities) {
    if (!isFoodSource(e)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** Nearest entity of an identity to a point. Helper, not a vocabulary name. */
export function nearest(
  world: World,
  identity: Identity,
  x: number,
  y: number,
): Entity | undefined {
  let best: Entity | undefined;
  let bestD = Infinity;
  for (const e of world.entities) {
    if (e.identity !== identity) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

const GRASS_GROW = 0.055;
const GRASS_SPREAD_RATE = 0.03;
const GRASS_SPREAD_RADIUS = 55;
const FLOWER_SPAWN_CHANCE = 0.012;
const FLOWER_SPAWN_COST = 0.18;
const FLOWER_CAP = 18;
const FLOWER_GROW = 0.05;
const FLOWER_BLOOM_AT = 0.85;
const FLOWER_WILT_SECONDS = 14;
const FLOWER_WILT_RETURN = 0.12;
const FLOWER_WILT_RADIUS = 70;
const FULLNESS_DRAIN = 0.08;
const FRAIL_AGE = 40;
const FRAIL_MULT = 1.75;
const FULLNESS_EAT = 0.35;
const FOOD_BITE = 0.22;
const HUNGRY = 0.45;
const REPRODUCE_FULLNESS = 0.85;
const REPRODUCE_COOLDOWN = 12;
const EAT_RADIUS = 28;
const SEEK_SPEED = 1.15;
const CHILD_FULLNESS = 0.45;

function behaveDay(e: Entity, _world: World, dt: number): void {
  transform(e, "cycle", (c) => (c + dt / DAY_SECONDS) % 1);
}

function behaveGrass(e: Entity, world: World, dt: number): void {
  const factor = growthFactor(world);
  store(e, "amount", GRASS_GROW * factor * dt, 1);
  const amount = e.local?.amount ?? 0;

  // Light spread: near-full patches feed a nearby sparse neighbor.
  if (amount >= 0.9) {
    let needy: Entity | undefined;
    let bestD = GRASS_SPREAD_RADIUS * GRASS_SPREAD_RADIUS;
    for (const g of world.entities) {
      if (g.identity !== "grass" || g.id === e.id) continue;
      const a = g.local?.amount ?? 0;
      if (a >= 0.55) continue;
      const dx = g.x - e.x;
      const dy = g.y - e.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        needy = g;
      }
    }
    if (needy) {
      store(needy, "amount", GRASS_SPREAD_RATE * factor * dt, 1);
    }
  }

  // Occasional flower spawn from rich grass under good conditions.
  if (amount >= 0.92 && factor > 0.6) {
    const flowers = world.entities.filter((x) => x.identity === "flower").length;
    if (
      flowers < FLOWER_CAP &&
      random(world) < FLOWER_SPAWN_CHANCE * factor * dt
    ) {
      const taken = decay(e, "amount", FLOWER_SPAWN_COST);
      if (taken <= 0) return;
      const angle = random(world) * Math.PI * 2;
      const dist = 12 + random(world) * 20;
      emit(world, {
        identity: "flower",
        x: clamp(e.x + Math.cos(angle) * dist, 40, world.width - 40),
        y: clamp(e.y + Math.sin(angle) * dist, 40, world.height - 40),
        facing: 0,
        speed: 0,
        local: { amount: 0.05 + random(world) * 0.15, bloomed: false, age: 0 },
      });
    }
  }
}

function behaveFlower(e: Entity, world: World, dt: number): void {
  const L = localOf(e);
  const factor = growthFactor(world);

  if (!L.bloomed) {
    store(e, "amount", FLOWER_GROW * factor * dt, 1);
    if ((e.local?.amount ?? 0) >= FLOWER_BLOOM_AT) {
      L.bloomed = true;
      transform(e, "age", () => 0);
    }
    return;
  }

  // Bloomed: age is time since bloom; then wilt and leave.
  transform(e, "age", (a) => a + dt);
  if ((e.local?.age ?? 0) >= FLOWER_WILT_SECONDS) {
    const peer = nearest(world, "grass", e.x, e.y);
    if (peer) {
      const d = Math.hypot(peer.x - e.x, peer.y - e.y);
      if (d <= FLOWER_WILT_RADIUS) {
        emit(peer, "amount", FLOWER_WILT_RETURN, 1);
      }
    }
    removeEntity(world, e.id);
  }
}

function behaveCreature(e: Entity, world: World, dt: number): void {
  transform(e, "age", (a) => a + dt);
  decay(e, "cooldown", dt);

  const age = e.local?.age ?? 0;
  const drain = FULLNESS_DRAIN * (age > FRAIL_AGE ? FRAIL_MULT : 1) * dt;
  decay(e, "fullness", drain);
  let fullness = e.local?.fullness ?? 0;

  if (fullness <= 0) {
    removeEntity(world, e.id);
    return;
  }

  const hungry = fullness < HUNGRY;
  const food = hungry ? nearestFood(world, e.x, e.y) : undefined;

  if (food) {
    const dx = food.x - e.x;
    const dy = food.y - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1e-3) {
      e.facing = Math.atan2(dy, dx);
    }
    const speed = e.speed * SEEK_SPEED;
    e.x += Math.cos(e.facing) * speed * dt;
    e.y += Math.sin(e.facing) * speed * dt;
    keepInBounds(e, world);

    if (dist <= EAT_RADIUS) {
      const bite = decay(food, "amount", FOOD_BITE);
      if (bite > 0) {
        store(e, "fullness", FULLNESS_EAT * (bite / FOOD_BITE), 1);
        fullness = e.local?.fullness ?? 0;
      }
    }
  } else {
    e.x += Math.cos(e.facing) * e.speed * dt;
    e.y += Math.sin(e.facing) * e.speed * dt;
    keepInBounds(e, world);
    e.facing += (random(world) - 0.5) * 1.4 * dt;
  }

  if (
    fullness >= REPRODUCE_FULLNESS &&
    (e.local?.cooldown ?? 0) <= 0 &&
    age > 8
  ) {
    transform(e, "fullness", (f) => f * 0.55);
    store(e, "cooldown", REPRODUCE_COOLDOWN);
    const angle = random(world) * Math.PI * 2;
    const dist = 20 + random(world) * 24;
    emit(world, {
      identity: "creature",
      x: clamp(e.x + Math.cos(angle) * dist, 40, world.width - 40),
      y: clamp(e.y + Math.sin(angle) * dist, 40, world.height - 40),
      facing: random(world) * Math.PI * 2,
      speed: 28 + random(world) * 18,
      local: {
        fullness: CHILD_FULLNESS,
        age: 0,
        cooldown: REPRODUCE_COOLDOWN * 0.5,
      },
    });
  }
}

export const meadowIdentities: Record<Identity, IdentityDef> = {
  day: {
    id: "day",
    describes:
      "The meadow’s day–night cycle — continuous time of day, not a goal.",
    behave: behaveDay,
  },
  tree: {
    id: "tree",
    describes: "A rooted plant that stands and shades the meadow.",
  },
  grass: {
    id: "grass",
    describes:
      "A patch of grass that regenerates under local conditions, spreads when rich, and can be eaten.",
    behave: behaveGrass,
  },
  flower: {
    id: "flower",
    describes:
      "A meadow flower that sprouts, grows, blooms, then wilts and dies — not food.",
    behave: behaveFlower,
  },
  creature: {
    id: "creature",
    describes:
      "A meadow animal that wanders, seeks food when hungry, reproduces when able, and dies when spent.",
    behave: behaveCreature,
  },
};
