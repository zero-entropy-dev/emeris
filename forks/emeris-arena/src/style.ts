/**
 * Programmable look. Reinterpret the whole world without rewriting entities.
 *
 * Marks may read the world but must never mutate it, and must never draw from
 * the world RNG. Same laws apply to `frame`.
 */

import { isEnemy, levelOf, type Entity, type Identity, type World } from "./sim";

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

function paintTopDownChrome(
  ctx: CanvasRenderingContext2D,
  world: World,
): void {
  const player = playerOf(world);
  const score = player?.local?.score ?? 0;
  ctx.fillStyle = "rgba(210, 220, 230, 0.78)";
  ctx.font = "14px ui-monospace, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Arena — top-down", 16, 16);
  ctx.fillText(
    `enemies ${enemyCount(world)} · score ${score} · tick ${world.tick}`,
    16,
    36,
  );
}

const markLevel: Mark = () => {};

const markPlayerTop: Mark = (ctx, e) => {
  ctx.fillStyle = "#f0d090";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff8e0";
  ctx.lineWidth = 0.1;
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(e.x + Math.cos(e.facing) * 0.6, e.y + Math.sin(e.facing) * 0.6);
  ctx.stroke();
};

/** Wide disc — drone. */
const markDroneTop: Mark = (ctx, e) => {
  ctx.fillStyle = "#5a9ad4";
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, 0.38, 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8dcff";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.12, 0, Math.PI * 2);
  ctx.fill();
};

/** Tall thin mark — stalker. */
const markStalkerTop: Mark = (ctx, e) => {
  ctx.fillStyle = "#c45c6a";
  ctx.beginPath();
  ctx.ellipse(e.x, e.y, 0.16, 0.42, e.facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0a8b0";
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
  ctx.fillStyle = "#ffe090";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.14, 0, Math.PI * 2);
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
}

export const topDown: Style = {
  name: "top-down",
  frame: (ctx, world, view, _cam, entities) => {
    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, view.width, view.height);

    const scale = cellScale(world, view);
    const { ox, oy } = topDownOrigin(world, view, scale);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    paintLevelGrid(ctx, world, "#1c2838", "#4a5d72", "#6a7e94");
    entities();
    ctx.restore();

    paintTopDownChrome(ctx, world);
  },
  marks: {
    level: markLevel,
    player: markPlayerTop,
    drone: markDroneTop,
    stalker: markStalkerTop,
    bolt: markBoltTop,
  },
  unknown: markUnknown,
};

type RayHit = { dist: number; side: 0 | 1 };

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
  if (!cells) return { dist: 0.01, side: 0 };

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

  const dist =
    side === 0
      ? (mapX - ox + (1 - stepX) / 2) / (dirX || 1e-12)
      : (mapY - oy + (1 - stepY) / 2) / (dirY || 1e-12);

  return { dist: Math.max(0.05, Math.abs(dist)), side };
}

function paintFloorCeiling(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const half = h / 2;
  const ceil = ctx.createLinearGradient(0, 0, 0, half);
  ceil.addColorStop(0, "#101820");
  ceil.addColorStop(1, "#1c2838");
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, w, half);

  const floor = ctx.createLinearGradient(0, half, 0, h);
  floor.addColorStop(0, "#1a2430");
  floor.addColorStop(1, "#0a0e14");
  ctx.fillStyle = floor;
  ctx.fillRect(0, half, w, half);
}

/** Style-only weapon — presentation reads player cooldown for recoil. */
function paintWeapon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cooldown: number,
): void {
  const kick = Math.min(1, cooldown / 0.22);
  const dip = kick * 28;
  const nudge = kick * 10;
  const bx = w * 0.58 + nudge;
  const by = h - 8 + dip;

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.08 + kick * 0.06);

  // Forearm / receiver
  ctx.fillStyle = "#2a3038";
  ctx.fillRect(-28, -36, 56, 42);
  ctx.fillStyle = "#3a424c";
  ctx.fillRect(-22, -52, 44, 20);

  // Barrel
  ctx.fillStyle = "#1a1e24";
  ctx.fillRect(-8, -118, 16, 68);
  ctx.fillStyle = "#4a5560";
  ctx.fillRect(-6, -122, 12, 8);

  // Sight
  ctx.strokeStyle = "#c8d0d8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -128);
  ctx.lineTo(0, -138);
  ctx.stroke();

  // Muzzle flash when freshly fired
  if (kick > 0.55) {
    ctx.fillStyle = `rgba(255, 220, 120, ${kick * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(0, -130, 10 + kick * 8, 6 + kick * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
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

  const w = view.width;
  const h = view.height;
  const halfH = h / 2;

  paintFloorCeiling(ctx, w, h);

  const FOV = Math.PI / 2.85;
  const dirX0 = Math.cos(player.facing);
  const dirY0 = Math.sin(player.facing);
  const planeScale = Math.tan(FOV / 2);
  const planeX = Math.cos(player.facing + Math.PI / 2) * planeScale;
  const planeY = Math.sin(player.facing + Math.PI / 2) * planeScale;

  const zBuffer = new Float64Array(w);

  for (let col = 0; col < w; col++) {
    const cameraX = (2 * col) / w - 1;
    const rayDirX = dirX0 + planeX * cameraX;
    const rayDirY = dirY0 + planeY * cameraX;
    const hit = castRay(world, player.x, player.y, rayDirX, rayDirY);

    const dist = Math.max(
      0.05,
      hit.dist * Math.cos(Math.atan2(rayDirY, rayDirX) - player.facing),
    );
    zBuffer[col] = dist;

    const lineH = Math.min(h * 2.2, Math.floor(h / dist));
    const drawStart = Math.max(0, Math.floor(halfH - lineH / 2));
    const drawEnd = Math.min(h, Math.floor(halfH + lineH / 2));
    const colH = Math.max(1, drawEnd - drawStart);

    const shade = hit.side === 1 ? 0.55 : 1;
    const depth = Math.min(1, 1.4 / (dist + 0.4));
    const fog = Math.min(1, dist / 14);
    const r = Math.floor((95 + depth * 45) * shade * depth * (1 - fog * 0.45));
    const g = Math.floor((115 + depth * 40) * shade * depth * (1 - fog * 0.4));
    const b = Math.floor((135 + depth * 35) * shade * depth * (1 - fog * 0.35));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(col, drawStart, 1, colH);

    // Soft top/bottom outline for readability
    if (colH > 4) {
      ctx.fillStyle = `rgba(180, 200, 220, ${0.12 * depth})`;
      ctx.fillRect(col, drawStart, 1, 2);
      ctx.fillRect(col, drawEnd - 2, 1, 2);
    }
  }

  type Sprite = { e: Entity; dist: number; kind: Identity };
  const sprites: Sprite[] = [];
  for (const e of world.entities) {
    if (isEnemy(e.identity) || e.identity === "bolt") {
      sprites.push({
        e,
        dist: Math.hypot(e.x - player.x, e.y - player.y),
        kind: e.identity,
      });
    }
  }
  sprites.sort((a, b) => b.dist - a.dist);

  const invDet = 1 / (planeX * dirY0 - dirX0 * planeY);
  for (const s of sprites) {
    if (s.dist < 0.12) continue;
    const dx = s.e.x - player.x;
    const dy = s.e.y - player.y;
    const transformX = invDet * (dirY0 * dx - dirX0 * dy);
    const transformY = invDet * (-planeY * dx + planeX * dy);
    if (transformY <= 0.05) continue;

    const spriteScreenX = (w / 2) * (1 + transformX / transformY);
    const spriteH = Math.abs(h / transformY);
    let aspect = 0.7;
    if (s.kind === "drone") aspect = 1.15;
    if (s.kind === "stalker") aspect = 0.38;
    if (s.kind === "bolt") aspect = 0.35;
    const spriteW = spriteH * aspect;
    const drawStartY = Math.max(0, Math.floor(halfH - spriteH / 2));
    const drawEndY = Math.min(h - 1, Math.floor(halfH + spriteH / 2));
    const drawStartX = Math.max(0, Math.floor(spriteScreenX - spriteW / 2));
    const drawEndX = Math.min(w - 1, Math.floor(spriteScreenX + spriteW / 2));

    const midX = (drawStartX + drawEndX) / 2;
    const midY = (drawStartY + drawEndY) / 2;
    const radX = Math.max(1, (drawEndX - drawStartX) / 2);
    const radY = Math.max(1, (drawEndY - drawStartY) / 2);

    const sampleCol = Math.min(w - 1, Math.max(0, Math.floor(midX)));
    if (transformY >= zBuffer[sampleCol]!) continue;

    if (s.kind === "drone") {
      ctx.fillStyle = "#3a7ab8";
      ctx.beginPath();
      ctx.ellipse(midX, midY, radX, radY * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(200, 230, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#d0ecff";
      ctx.beginPath();
      ctx.ellipse(midX, midY, radX * 0.28, radY * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === "stalker") {
      ctx.fillStyle = "#a03848";
      ctx.beginPath();
      ctx.ellipse(midX, midY + radY * 0.1, radX * 0.7, radY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e88898";
      ctx.beginPath();
      ctx.ellipse(midX, midY - radY * 0.55, radX * 0.55, radY * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 180, 190, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(midX, midY + radY * 0.1, radX * 0.7, radY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.ellipse(midX, midY, radX, radY, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const vig = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.32,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  paintWeapon(ctx, w, h, player.local?.cooldown ?? 0);

  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = "rgba(240, 245, 255, 0.7)";
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
  ctx.fillStyle = "rgba(240, 245, 255, 0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
  ctx.fill();

  const score = player.local?.score ?? 0;
  const cooling = (player.local?.cooldown ?? 0) > 0;
  ctx.fillStyle = "rgba(210, 220, 230, 0.8)";
  ctx.font = "14px ui-monospace, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Arena — first person", 16, 16);
  ctx.fillText(
    `enemies ${enemyCount(world)} · score ${score}${cooling ? " · …" : ""}`,
    16,
    36,
  );
}

export const firstPerson: Style = {
  name: "first person",
  frame: (ctx, world, view) => {
    paintFirstPerson(ctx, world, view);
  },
  marks: {
    level: markLevel,
    player: () => {},
    drone: () => {},
    stalker: () => {},
    bolt: () => {},
  },
  unknown: markUnknown,
};

export const styles: Style[] = [firstPerson, topDown];
