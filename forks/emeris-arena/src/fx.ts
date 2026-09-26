/**
 * Observer-only particles. Reads the world between frames; never writes it
 * and never draws from world RNG. Deaths and wall hits are inferred from
 * entities that were present last frame and are gone now. Enemies only
 * leave the world by dying, so any vanished enemy is a kill.
 */

import { BOLT_LIFE, SHOT_LIFE, isEnemy, type World } from "./sim";

export type Particle = {
  x: number;
  y: number;
  /** Height in cells: 0 floor, 0.5 eye level, 1 ceiling. */
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  r: number;
  g: number;
  b: number;
  /** Size in cells. */
  size: number;
};

type Seen = {
  identity: string;
  x: number;
  y: number;
  facing: number;
  speed: number;
  age: number;
  hurt: number;
};

const CAP = 600;
const GRAVITY = 3.2;

export const particles: Particle[] = [];
const seen = new Map<number, Seen>();

function spray(
  x: number,
  y: number,
  z: number,
  count: number,
  speed: number,
  rgb: [number, number, number],
  life: number,
  size: number,
): void {
  for (let i = 0; i < count && particles.length < CAP; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.65);
    const t = life * (0.6 + Math.random() * 0.4);
    particles.push({
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      vz: (Math.random() * 0.9 + 0.2) * speed,
      life: t,
      max: t,
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      size: size * (0.6 + Math.random() * 0.6),
    });
  }
}

function vanished(s: Seen): void {
  if (isEnemy(s.identity)) {
    const rgb: [number, number, number] =
      s.identity === "drone" ? [130, 186, 240] : [226, 112, 132];
    spray(s.x, s.y, 0.5, 16 + Math.floor(Math.random() * 9), 2.4, rgb, 0.9, 0.07);
    spray(s.x, s.y, 0.5, 6, 1.2, [240, 244, 255], 0.35, 0.05);
    return;
  }
  const step = 1 / 60;
  if (s.identity === "bolt" && s.age < BOLT_LIFE - step * 1.5) {
    const x = s.x + Math.cos(s.facing) * s.speed * step * 0.5;
    const y = s.y + Math.sin(s.facing) * s.speed * step * 0.5;
    spray(x, y, 0.5, 7, 1.6, [214, 232, 255], 0.3, 0.04);
    return;
  }
  if (s.identity === "shot" && s.age < SHOT_LIFE - step * 1.5) {
    spray(s.x, s.y, 0.5, 6, 1.1, [255, 158, 84], 0.35, 0.045);
  }
}

/** Call once per frame after the world has stepped. */
export function observeFx(world: World, dt: number): void {
  const present = new Set<number>();
  for (const e of world.entities) {
    if (!isEnemy(e.identity) && e.identity !== "bolt" && e.identity !== "shot") {
      continue;
    }
    present.add(e.id);
    const s = seen.get(e.id);
    const next: Seen = s ?? {
      identity: e.identity,
      x: 0,
      y: 0,
      facing: 0,
      speed: 0,
      age: 0,
      hurt: 0,
    };
    next.x = e.x;
    next.y = e.y;
    next.facing = e.facing;
    next.speed = e.speed;
    next.age = e.local?.age ?? 0;
    next.hurt = e.local?.hurt ?? 0;
    seen.set(e.id, next);
  }
  for (const [id, s] of seen) {
    if (present.has(id)) continue;
    vanished(s);
    seen.delete(id);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.life -= dt;
    if (p.life <= 0) {
      particles[i] = particles[particles.length - 1]!;
      particles.pop();
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz -= GRAVITY * dt;
    if (p.z < 0) {
      p.z = 0;
      p.vz *= -0.35;
      p.vx *= 0.6;
      p.vy *= 0.6;
    }
  }
}

/** Forget everything — restart, restore, and new seed must not burst. */
export function resetFx(world?: World): void {
  particles.length = 0;
  seen.clear();
  if (world) observeFx(world, 0);
}
