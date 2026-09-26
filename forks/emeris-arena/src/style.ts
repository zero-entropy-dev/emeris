/**
 * Programmable look. Reinterpret the whole world without rewriting entities.
 *
 * Marks may read the world but must never mutate it, and must never draw from
 * the world RNG. Same laws apply to `frame`.
 */

import { particles } from "./fx";
import {
  FOG_DISTANCE,
  arenaLight,
  rgbaOf,
  type LightingRecipe,
} from "./light";
import {
  FIRE_COOLDOWN,
  HIT_MARK_TIME,
  HURT_TIME,
  PLAYER_HEALTH,
  WAVE_BREATHER,
  isEnemy,
  levelOf,
  waveOf,
  type Entity,
  type Identity,
  type World,
} from "./sim";
import { TEX, textureFor } from "./textures";

export type View = { width: number; height: number };

export type Mark = (
  ctx: CanvasRenderingContext2D,
  e: Entity,
  world: World,
) => void;

export type Style = {
  name: string;
  frame: (
    ctx: CanvasRenderingContext2D,
    world: World,
    view: View,
    cam: { x: number; y: number },
    entities: () => void,
  ) => void;
  marks: Partial<Record<Identity, Mark>>;
  unknown: Mark;
};

/** 3D scene resolution relative to the view. HUD stays full size. */
export const RENDER_SCALE = 0.6;

const light: LightingRecipe = arenaLight;

function markUnknown(ctx: CanvasRenderingContext2D, e: Entity): void {
  ctx.fillStyle = "#ff00aa";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function playerOf(world: World): Entity | undefined {
  return (
    world.entities.find((e) => e.id === world.focusId) ??
    world.entities.find((e) => e.identity === "player")
  );
}

function enemyCount(world: World): number {
  return world.entities.filter((e) => isEnemy(e.identity)).length;
}

function dead(player: Entity | undefined): boolean {
  return (player?.local?.health ?? 0) <= 0;
}

function waveNumber(world: World): number {
  return waveOf(world)?.local?.wave ?? 0;
}

function cellScale(world: World, view: View): number {
  const level = levelOf(world);
  const cols = level?.local?.cols ?? world.width;
  const rows = level?.local?.rows ?? world.height;
  return Math.min(view.width / cols, view.height / rows);
}

function topDownOrigin(
  world: World,
  view: View,
  scale: number,
): { ox: number; oy: number } {
  const level = levelOf(world);
  const cols = level?.local?.cols ?? world.width;
  const rows = level?.local?.rows ?? world.height;
  return {
    ox: (view.width - cols * scale) / 2,
    oy: (view.height - rows * scale) / 2,
  };
}

function paintHealthBar(
  ctx: CanvasRenderingContext2D,
  player: Entity,
  x: number,
  y: number,
): void {
  const hp = Math.max(0, player.local?.health ?? 0);
  const w = 92;
  const h = 8;
  ctx.fillStyle = "rgba(8, 12, 18, 0.65)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hp <= 1 ? "#c44858" : "#7ec8c0";
  ctx.fillRect(x, y, w * Math.min(1, hp / PLAYER_HEALTH), h);
  ctx.strokeStyle = "rgba(210, 220, 230, 0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function paintStatus(
  ctx: CanvasRenderingContext2D,
  world: World,
  player: Entity | undefined,
  title: string,
): void {
  const kills = player?.local?.score ?? 0;
  ctx.fillStyle = "rgba(210, 220, 230, 0.8)";
  ctx.font = "14px ui-monospace, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(title, 16, 16);
  ctx.fillText(
    `wave ${waveNumber(world)} · enemies ${enemyCount(world)} · kills ${kills}`,
    16,
    36,
  );
  if (player) paintHealthBar(ctx, player, 16, 58);
}

/** Wave-cleared and next-wave countdown, centred. */
function paintWaveBanner(
  ctx: CanvasRenderingContext2D,
  world: World,
  player: Entity | undefined,
  w: number,
  h: number,
): void {
  if (!player || dead(player)) return;
  const wave = waveOf(world);
  const breather = wave?.local?.breather ?? 0;
  if (breather <= 0) return;
  const current = wave?.local?.wave ?? 0;
  const cleared = current > 0 && breather > WAVE_BREATHER - 1.4;
  const line = cleared
    ? `Wave ${current} cleared`
    : `Wave ${current + 1} in ${Math.ceil(breather)}`;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "22px ui-monospace, Consolas, monospace";
  ctx.fillStyle = cleared
    ? "rgba(150, 230, 210, 0.9)"
    : "rgba(226, 234, 244, 0.85)";
  ctx.fillText(line, w / 2, h * 0.3);
  ctx.restore();
}

function paintDeath(
  ctx: CanvasRenderingContext2D,
  world: World,
  w: number,
  h: number,
): void {
  const player = playerOf(world);
  if (!player || !dead(player)) return;
  const kills = player.local?.score ?? 0;
  ctx.fillStyle = "rgba(2, 4, 8, 0.62)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e8eef8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "28px ui-monospace, Consolas, monospace";
  ctx.fillText("You died", w / 2, h / 2 - 28);
  ctx.font = "16px ui-monospace, Consolas, monospace";
  ctx.fillStyle = "rgba(210, 220, 230, 0.85)";
  ctx.fillText(
    `Reached wave ${waveNumber(world)} · ${kills} kills`,
    w / 2,
    h / 2 + 6,
  );
  ctx.fillText("Enter to restart · N new seed", w / 2, h / 2 + 32);
}

function paintHurtEdge(
  ctx: CanvasRenderingContext2D,
  player: Entity,
  w: number,
  h: number,
): void {
  const hurt = player.local?.hurt ?? 0;
  if (hurt <= 0) return;
  const a = (hurt / HURT_TIME) * 0.55;
  const edge = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72,
  );
  edge.addColorStop(0, "rgba(160, 20, 30, 0)");
  edge.addColorStop(1, `rgba(160, 24, 36, ${a})`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

const markLevel: Mark = () => {};
const markNothing: Mark = () => {};

const markPlayerTop: Mark = (ctx, e) => {
  ctx.fillStyle = "#d8e4f0";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f4f8ff";
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + Math.cos(e.facing) * 0.6, e.y + Math.sin(e.facing) * 0.6);
  ctx.stroke();
  const mark = e.local?.hitMark ?? 0;
  if (mark > 0) {
    ctx.strokeStyle = `rgba(255, 90, 80, ${mark / HIT_MARK_TIME})`;
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 0.46, 0, Math.PI * 2);
    ctx.stroke();
  }
};

function hurtFill(e: Entity, normal: string): string {
  return (e.local?.hurt ?? 0) > 0 ? "#f4f7ff" : normal;
}

/** Wide disc — drone. */
const markDroneTop: Mark = (ctx, e) => {
  ctx.fillStyle = hurtFill(e, "#4a7eae");
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, 0.38, 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8dff0";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.12, 0, Math.PI * 2);
  ctx.fill();
};

/** Tall thin mark — stalker. */
const markStalkerTop: Mark = (ctx, e) => {
  ctx.fillStyle = hurtFill(e, "#9a4454");
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, 0.16, 0.42, e.facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c4cc";
  ctx.beginPath();
  ctx.arc(
    e.x + Math.cos(e.facing) * 0.2,
    e.y + Math.sin(e.facing) * 0.2,
    0.1,
    0,
    Math.PI * 2,
  );
  ctx.fill();
};

const markBoltTop: Mark = (ctx, e) => {
  ctx.strokeStyle = "rgba(200, 222, 255, 0.45)";
  ctx.lineWidth = 0.08;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x - Math.cos(e.facing) * 0.7, e.y - Math.sin(e.facing) * 0.7);
  ctx.stroke();
  ctx.fillStyle = "#e4eeff";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.1, 0, Math.PI * 2);
  ctx.fill();
};

const markShotTop: Mark = (ctx, e) => {
  ctx.fillStyle = "rgba(255, 150, 70, 0.35)";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb070";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.11, 0, Math.PI * 2);
  ctx.fill();
};

function paintLevelGrid(
  ctx: CanvasRenderingContext2D,
  world: World,
  floor: string,
  wall: string,
  wallEdge: string,
): void {
  const level = levelOf(world);
  const cols = level?.local?.cols ?? 0;
  const rows = level?.local?.rows ?? 0;
  const cells = level?.local?.cells;
  if (!cells) return;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const solid = cells[y * cols + x] !== 0;
      ctx.fillStyle = solid ? wall : floor;
      ctx.fillRect(x, y, 1, 1);
      if (solid) {
        ctx.strokeStyle = wallEdge;
        ctx.lineWidth = 0.04;
        ctx.strokeRect(x + 0.02, y + 0.02, 0.96, 0.96);
      }
    }
  }
  const spawns = level?.local?.spawns ?? [];
  ctx.strokeStyle = "rgba(200, 120, 130, 0.35)";
  ctx.lineWidth = 0.05;
  for (let i = 0; i + 1 < spawns.length; i += 2) {
    ctx.strokeRect(spawns[i]! - 0.35, spawns[i + 1]! - 0.35, 0.7, 0.7);
  }
}

function paintParticlesTop(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${a})`;
    const s = p.size * 1.6;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
}

export const topDown: Style = {
  name: "top-down",
  frame: (ctx, world, view, _cam, entities) => {
    ctx.fillStyle = "#06080e";
    ctx.fillRect(0, 0, view.width, view.height);

    const scale = cellScale(world, view);
    const { ox, oy } = topDownOrigin(world, view, scale);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    paintLevelGrid(ctx, world, "#121820", "#3a4c60", "#5a7088");
    entities();
    paintParticlesTop(ctx);
    ctx.restore();

    const player = playerOf(world);
    if (player) paintHurtEdge(ctx, player, view.width, view.height);
    paintStatus(ctx, world, player, "Arena — top-down");
    paintWaveBanner(ctx, world, player, view.width, view.height);
    paintDeath(ctx, world, view.width, view.height);
  },
  marks: {
    level: markLevel,
    wave: markNothing,
    player: markPlayerTop,
    drone: markDroneTop,
    stalker: markStalkerTop,
    bolt: markBoltTop,
    shot: markShotTop,
  },
  unknown: markUnknown,
};

type RayHit = {
  /** Perpendicular distance to the wall. */
  dist: number;
  side: 0 | 1;
  mapX: number;
  mapY: number;
  /** Where along the wall face the ray landed, 0..1. */
  wallX: number;
};

const hit: RayHit = { dist: 0, side: 0, mapX: 0, mapY: 0, wallX: 0 };

function castRay(
  world: World,
  ox: number,
  oy: number,
  dirX: number,
  dirY: number,
): RayHit {
  const level = levelOf(world);
  const cols = level?.local?.cols ?? 0;
  const rows = level?.local?.rows ?? 0;
  const cells = level?.local?.cells;
  if (!cells) {
    hit.dist = 0.05;
    hit.side = 0;
    hit.wallX = 0;
    return hit;
  }

  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);

  const deltaDistX = Math.abs(1 / (dirX || 1e-12));
  const deltaDistY = Math.abs(1 / (dirY || 1e-12));

  let stepX: number;
  let stepY: number;
  let sideDistX: number;
  let sideDistY: number;

  if (dirX < 0) {
    stepX = -1;
    sideDistX = (ox - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - ox) * deltaDistX;
  }
  if (dirY < 0) {
    stepY = -1;
    sideDistY = (oy - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - oy) * deltaDistY;
  }

  let side: 0 | 1 = 0;
  for (let i = 0; i < 96; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapX >= cols || mapY >= rows) break;
    if (cells[mapY * cols + mapX]) break;
  }

  const raw =
    side === 0
      ? (mapX - ox + (1 - stepX) / 2) / (dirX || 1e-12)
      : (mapY - oy + (1 - stepY) / 2) / (dirY || 1e-12);
  const dist = Math.max(0.05, Math.abs(raw));
  const along = side === 0 ? oy + dist * dirY : ox + dist * dirX;

  hit.dist = dist;
  hit.side = side;
  hit.mapX = mapX;
  hit.mapY = mapY;
  hit.wallX = along - Math.floor(along);
  return hit;
}

/** Style-only weapon — presentation reads player cooldown for recoil. */
function paintWeapon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cooldown: number,
): void {
  const kick = Math.min(1, cooldown / FIRE_COOLDOWN);
  const dip = kick * 24;
  const nudge = kick * 9;
  const bx = w * 0.58 + nudge;
  const by = h - 8 + dip;

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.08 + kick * 0.06);

  ctx.fillStyle = "#242a32";
  ctx.fillRect(-28, -36, 56, 42);
  ctx.fillStyle = "#343c48";
  ctx.fillRect(-22, -52, 44, 20);

  ctx.fillStyle = "#12161c";
  ctx.fillRect(-8, -118, 16, 68);
  ctx.fillStyle = "#3e4a58";
  ctx.fillRect(-6, -122, 12, 8);

  ctx.strokeStyle = "#c8d4e0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -128);
  ctx.lineTo(0, -138);
  ctx.stroke();

  if (kick > 0.55) {
    ctx.fillStyle = `rgba(210, 230, 255, ${kick * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(0, -130, 10 + kick * 8, 6 + kick * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

type Sprite = { e: Entity; dist: number; kind: Identity };

let sceneCanvas: HTMLCanvasElement | null = null;
let sceneCtx: CanvasRenderingContext2D | null = null;
let sceneImage: ImageData | null = null;
let scenePixels = new Uint32Array(0);
let sceneW = 0;
let sceneH = 0;
let zBuffer = new Float64Array(0);
let rowColors = new Uint32Array(0);
const sprites: Sprite[] = [];

function pack(r: number, g: number, b: number): number {
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

function sceneTarget(viewW: number, viewH: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
} {
  const w = Math.max(1, Math.floor(viewW * RENDER_SCALE));
  const h = Math.max(1, Math.floor(viewH * RENDER_SCALE));
  if (!sceneCanvas || sceneW !== w || sceneH !== h) {
    sceneCanvas = document.createElement("canvas");
    sceneCanvas.width = w;
    sceneCanvas.height = h;
    const next = sceneCanvas.getContext("2d");
    if (!next) throw new Error("2d context unavailable");
    sceneCtx = next;
    sceneImage = next.createImageData(w, h);
    scenePixels = new Uint32Array(sceneImage.data.buffer);
    rowColors = new Uint32Array(h);
    sceneW = w;
    sceneH = h;
  }
  if (zBuffer.length !== w) zBuffer = new Float64Array(w);
  return { canvas: sceneCanvas, ctx: sceneCtx!, w, h };
}

/** Ceiling and floor colour for every row, from the lighting recipe. */
function fillRows(h: number, recipe: LightingRecipe): void {
  const half = Math.floor(h / 2);
  const fill = rgbaOf(recipe.fill);
  const ground = rgbaOf(recipe.ground);
  for (let y = 0; y < h; y++) {
    if (y < half) {
      const t = y / Math.max(1, half);
      rowColors[y] = pack(
        Math.min(255, fill.r + 18 * t) | 0,
        Math.min(255, fill.g + 22 * t) | 0,
        Math.min(255, fill.b + 28 * t) | 0,
      );
    } else {
      const t = 1 - (y - half) / Math.max(1, h - half);
      rowColors[y] = pack(
        Math.min(255, ground.r + 22 * t) | 0,
        Math.min(255, ground.g + 26 * t) | 0,
        Math.min(255, ground.b + 32 * t) | 0,
      );
    }
  }
}

function collectSprites(world: World, player: Entity): number {
  let n = 0;
  for (const e of world.entities) {
    if (!isEnemy(e.identity) && e.identity !== "bolt" && e.identity !== "shot") {
      continue;
    }
    const slot = sprites[n] ?? { e, dist: 0, kind: e.identity };
    slot.e = e;
    slot.dist = Math.hypot(e.x - player.x, e.y - player.y);
    slot.kind = e.identity;
    sprites[n] = slot;
    n += 1;
  }
  for (let i = 1; i < n; i++) {
    const item = sprites[i]!;
    let j = i - 1;
    while (j >= 0 && sprites[j]!.dist < item.dist) {
      sprites[j + 1] = sprites[j]!;
      j -= 1;
    }
    sprites[j + 1] = item;
  }
  return n;
}

type Camera = {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  invDet: number;
  w: number;
  h: number;
};

type Projected = { sx: number; sy: number; depth: number; scale: number };
const projected: Projected = { sx: 0, sy: 0, depth: 0, scale: 0 };

/** World point (z = height in cells) to scene pixels. Null when behind. */
function project(
  cam: Camera,
  x: number,
  y: number,
  z: number,
): Projected | null {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const tx = cam.invDet * (cam.dirY * dx - cam.dirX * dy);
  const ty = cam.invDet * (-cam.planeY * dx + cam.planeX * dy);
  if (ty <= 0.05) return null;
  const scale = cam.h / ty;
  projected.sx = (cam.w / 2) * (1 + tx / ty);
  projected.sy = cam.h / 2 - (z - 0.5) * scale;
  projected.depth = ty;
  projected.scale = scale;
  return projected;
}

function visible(p: Projected, w: number): boolean {
  const col = Math.floor(p.sx);
  if (col < 0 || col >= w) return false;
  return p.depth < zBuffer[col]!;
}

function paintWalls(world: World, cam: Camera): void {
  const { w, h } = cam;
  const halfH = h / 2;
  const fog = rgbaOf(light.fog);
  fillRows(h, light);
  for (let y = 0; y < h; y++) {
    scenePixels.fill(rowColors[y]!, y * w, (y + 1) * w);
  }

  for (let col = 0; col < w; col++) {
    const cameraX = (2 * col) / w - 1;
    const rayDirX = cam.dirX + cam.planeX * cameraX;
    const rayDirY = cam.dirY + cam.planeY * cameraX;
    const ray = castRay(world, cam.x, cam.y, rayDirX, rayDirY);
    const dist = ray.dist;
    zBuffer[col] = dist;

    const lineH = h / dist;
    const top = halfH - lineH / 2;
    const drawStart = Math.max(0, Math.floor(top));
    const drawEnd = Math.min(h, Math.floor(halfH + lineH / 2));
    if (drawEnd <= drawStart) continue;

    const shade = ray.side === 1 ? 0.6 : 1;
    const depth = Math.min(1, 1.15 / (dist * 0.35 + 0.55));
    const fogAmt = Math.min(1, dist / FOG_DISTANCE) * fog.a;
    const k = shade * depth * (1 - fogAmt);
    const ar = fog.r * fogAmt;
    const ag = fog.g * fogAmt;
    const ab = fog.b * fogAmt;

    let texX = Math.floor(ray.wallX * TEX);
    if (ray.side === 0 && rayDirX > 0) texX = TEX - 1 - texX;
    if (ray.side === 1 && rayDirY < 0) texX = TEX - 1 - texX;
    if (texX < 0) texX = 0;
    if (texX >= TEX) texX = TEX - 1;

    const tex = textureFor(ray.mapX, ray.mapY);
    const stepV = TEX / lineH;
    let v = (drawStart - top) * stepV;
    let idx = drawStart * w + col;
    for (let y = drawStart; y < drawEnd; y++) {
      let ty = v | 0;
      if (ty >= TEX) ty = TEX - 1;
      const t = (ty * TEX + texX) * 3;
      const r = (tex[t]! * k + ar) | 0;
      const g = (tex[t + 1]! * k + ag) | 0;
      const b = (tex[t + 2]! * k + ab) | 0;
      scenePixels[idx] =
        (0xff000000 |
          ((b > 255 ? 255 : b) << 16) |
          ((g > 255 ? 255 : g) << 8) |
          (r > 255 ? 255 : r)) >>>
        0;
      v += stepV;
      idx += w;
    }
  }
}

function paintSprites(
  ctx: CanvasRenderingContext2D,
  world: World,
  player: Entity,
  cam: Camera,
): void {
  const { w, h } = cam;
  const halfH = h / 2;
  const count = collectSprites(world, player);
  for (let i = 0; i < count; i++) {
    const s = sprites[i]!;
    if (s.dist < 0.12) continue;

    if (s.kind === "bolt" || s.kind === "shot") {
      const bolt = s.kind === "bolt";
      const trail = bolt ? 3 : 2;
      for (let t = trail; t >= 0; t--) {
        const back = t * (bolt ? 0.22 : 0.12);
        const p = project(
          cam,
          s.e.x - Math.cos(s.e.facing) * back,
          s.e.y - Math.sin(s.e.facing) * back,
          0.5,
        );
        if (!p || !visible(p, w)) continue;
        const a = t === 0 ? 1 : 0.5 * (1 - t / (trail + 1));
        const rad = Math.max(1, p.scale * (bolt ? 0.05 : 0.08) * (t === 0 ? 1 : 0.7));
        ctx.fillStyle = bolt
          ? `rgba(220, 236, 255, ${a})`
          : `rgba(255, 150, 70, ${a})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
        ctx.fill();
        if (t === 0) {
          ctx.fillStyle = bolt
            ? "rgba(160, 200, 255, 0.25)"
            : "rgba(255, 130, 60, 0.3)";
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, rad * 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      continue;
    }

    const p = project(cam, s.e.x, s.e.y, 0.5);
    if (!p) continue;
    const spriteH = p.scale;
    const aspect = s.kind === "drone" ? 1.15 : 0.38;
    const spriteW = spriteH * aspect;
    const drawStartY = Math.max(0, Math.floor(halfH - spriteH / 2));
    const drawEndY = Math.min(h - 1, Math.floor(halfH + spriteH / 2));
    const drawStartX = Math.max(0, Math.floor(p.sx - spriteW / 2));
    const drawEndX = Math.min(w - 1, Math.floor(p.sx + spriteW / 2));

    const midX = (drawStartX + drawEndX) / 2;
    const midY = (drawStartY + drawEndY) / 2;
    const radX = Math.max(1, (drawEndX - drawStartX) / 2);
    const radY = Math.max(1, (drawEndY - drawStartY) / 2);

    const sampleCol = Math.min(w - 1, Math.max(0, Math.floor(midX)));
    if (p.depth >= zBuffer[sampleCol]!) continue;

    const flashing = (s.e.local?.hurt ?? 0) > 0;
    if (s.kind === "drone") {
      ctx.fillStyle = flashing ? "#f4f7ff" : "#3a6ea8";
      ctx.beginPath();
      ctx.ellipse(midX, midY, radX, radY * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(190, 214, 232, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = flashing ? "#ffffff" : "#c5d8ea";
      ctx.beginPath();
      ctx.ellipse(midX, midY, radX * 0.28, radY * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = flashing ? "#f4f7ff" : "#8a3040";
      ctx.beginPath();
      ctx.ellipse(midX, midY + radY * 0.1, radX * 0.7, radY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flashing ? "#ffffff" : "#d8a0aa";
      ctx.beginPath();
      ctx.ellipse(midX, midY - radY * 0.55, radX * 0.55, radY * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(220, 190, 198, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(midX, midY + radY * 0.1, radX * 0.7, radY, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function paintParticles(ctx: CanvasRenderingContext2D, cam: Camera): void {
  for (const q of particles) {
    const p = project(cam, q.x, q.y, q.z);
    if (!p || !visible(p, cam.w)) continue;
    const a = Math.max(0, q.life / q.max);
    const s = Math.max(1, q.size * p.scale);
    ctx.fillStyle = `rgba(${q.r}, ${q.g}, ${q.b}, ${a})`;
    ctx.fillRect(p.sx - s / 2, p.sy - s / 2, s, s);
  }
}

function paintScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  player: Entity,
  w: number,
  h: number,
): void {
  const FOV = Math.PI / 2.85;
  const dirX = Math.cos(player.facing);
  const dirY = Math.sin(player.facing);
  const planeScale = Math.tan(FOV / 2);
  const planeX = Math.cos(player.facing + Math.PI / 2) * planeScale;
  const planeY = Math.sin(player.facing + Math.PI / 2) * planeScale;
  const cam: Camera = {
    x: player.x,
    y: player.y,
    dirX,
    dirY,
    planeX,
    planeY,
    invDet: 1 / (planeX * dirY - dirX * planeY),
    w,
    h,
  };

  paintWalls(world, cam);
  ctx.putImageData(sceneImage!, 0, 0);
  paintSprites(ctx, world, player, cam);
  paintParticles(ctx, cam);

  const vig = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.32,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function paintCrosshair(
  ctx: CanvasRenderingContext2D,
  player: Entity,
  w: number,
  h: number,
): void {
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = "rgba(232, 240, 248, 0.72)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();
  ctx.fillStyle = "rgba(232, 240, 248, 0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
  ctx.fill();

  const cooldown = player.local?.cooldown ?? 0;
  if (cooldown > 0) {
    const ready = 1 - Math.min(1, cooldown / FIRE_COOLDOWN);
    ctx.strokeStyle = "rgba(200, 222, 245, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready);
    ctx.stroke();
  }

  const mark = player.local?.hitMark ?? 0;
  if (mark > 0) {
    const a = mark / HIT_MARK_TIME;
    const len = 6;
    const gap = 8;
    ctx.strokeStyle = `rgba(255, 86, 74, ${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - gap, cy - gap);
    ctx.lineTo(cx - gap - len, cy - gap - len);
    ctx.moveTo(cx + gap, cy - gap);
    ctx.lineTo(cx + gap + len, cy - gap - len);
    ctx.moveTo(cx - gap, cy + gap);
    ctx.lineTo(cx - gap - len, cy + gap + len);
    ctx.moveTo(cx + gap, cy + gap);
    ctx.lineTo(cx + gap + len, cy + gap + len);
    ctx.stroke();
  }
}

function paintOverlay(
  ctx: CanvasRenderingContext2D,
  world: World,
  player: Entity,
  w: number,
  h: number,
): void {
  paintHurtEdge(ctx, player, w, h);
  if (!dead(player)) paintWeapon(ctx, w, h, player.local?.cooldown ?? 0);
  paintCrosshair(ctx, player, w, h);
  paintStatus(ctx, world, player, "Arena — first person");
  paintWaveBanner(ctx, world, player, w, h);
  paintDeath(ctx, world, w, h);
}

function paintFirstPerson(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: View,
): void {
  const player = playerOf(world);
  if (!player) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, view.width, view.height);
    return;
  }

  const scene = sceneTarget(view.width, view.height);
  paintScene(scene.ctx, world, player, scene.w, scene.h);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene.canvas, 0, 0, view.width, view.height);
  ctx.imageSmoothingEnabled = true;

  paintOverlay(ctx, world, player, view.width, view.height);
}

export const firstPerson: Style = {
  name: "first person",
  frame: (ctx, world, view) => {
    paintFirstPerson(ctx, world, view);
  },
  marks: {
    level: markLevel,
    wave: markNothing,
    player: markNothing,
    drone: markNothing,
    stalker: markNothing,
    bolt: markNothing,
    shot: markNothing,
  },
  unknown: markUnknown,
};

export const styles: Style[] = [firstPerson, topDown];
