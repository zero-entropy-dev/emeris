/**
 * Headless step cost across several waves. No canvas.
 * Run: npm run bench
 */
import {
  createWorld,
  isEnemy,
  removeEntity,
  step,
  waveOf,
  type Intent,
} from "../src/sim/index.ts";

/** The scripted player can't aim, so each wave is cleared 10s after it has fully spawned. */
const HOLD = 600;

const STEP = 1 / 60;
const N = 10_000;

const world = createWorld(undefined, undefined, 1);
const player = world.entities.find((e) => e.identity === "player")!;
if (player.local) player.local.health = 1e9;

const wave = waveOf(world)!;
let peak = 0;
let held = 0;
const start = performance.now();
for (let i = 0; i < N; i++) {
  const intent: Intent = {
    steerX: 0,
    steerY: i % 80 < 40 ? 1 : -1,
    lookYaw: 0.01,
    fire: i % 15 === 0,
  };
  step(world, STEP, intent);
  const spawning = (wave.local?.pending ?? 0) + (wave.local?.pendingStalkers ?? 0) > 0;
  const live = (wave.local?.wave ?? 0) > 0 && (wave.local?.breather ?? 0) <= 0;
  held = live && !spawning ? held + 1 : 0;
  if (held >= HOLD) {
    for (const e of [...world.entities]) {
      if (isEnemy(e.identity)) removeEntity(world, e.id);
    }
    held = 0;
  }
  if (i % 60 === 0) {
    peak = Math.max(peak, world.entities.filter((e) => isEnemy(e.identity)).length);
  }
}
const ms = performance.now() - start;
console.log(
  `bench — ${N} steps in ${ms.toFixed(1)} ms (${(ms / N).toFixed(4)} ms/step) tick=${world.tick} wave=${waveOf(world)?.local?.wave ?? 0} peak enemies=${peak} entities=${world.entities.length}`,
);
