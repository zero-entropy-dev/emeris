/**
 * Programmable look — top-down tactics grid. Marks never mutate the world.
 */

import {
  SIDE_ENEMY,
  SIDE_PLAYER,
  boardOf,
  canAttack,
  canMove,
  currentActor,
  squadOrder,
  type Entity,
  type Identity,
  type World,
} from "./sim";

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

/** CSS pixels per world cell — observer layout only. */
export function cellSize(world: World, view: View): number {
  const padX = 72;
  const padTop = 110;
  const padBottom = 64;
  const cw = (view.width - padX * 2) / world.width;
  const ch = (view.height - padTop - padBottom) / world.height;
  return Math.max(8, Math.floor(Math.min(cw, ch)));
}

export function boardOrigin(world: World, view: View): { x: number; y: number } {
  const s = cellSize(world, view);
  return {
    x: Math.floor((view.width - world.width * s) / 2),
    y: Math.floor((view.height - world.height * s) / 2) + 28,
  };
}

function markUnknown(ctx: CanvasRenderingContext2D, e: Entity): void {
  ctx.fillStyle = "#ff00aa";
  ctx.beginPath();
  ctx.arc(e.x, e.y, 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function paintBoardGrid(
  ctx: CanvasRenderingContext2D,
  world: World,
  ink: string,
  fillOdd: string,
  fillSolid: string,
): void {
  const board = boardOf(world);
  const cells = board?.local?.cells;
  const cols = board?.local?.cols ?? world.width;
  const rows = board?.local?.rows ?? world.height;
  if (!cells) return;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const solid = cells[y * cols + x] === 1;
      ctx.fillStyle = solid ? fillSolid : (x + y) % 2 === 0 ? fillOdd : ink;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function paintLegalCells(ctx: CanvasRenderingContext2D, world: World): void {
  const board = boardOf(world);
  if ((board?.local?.turnSide ?? -1) !== SIDE_PLAYER) return;
  if ((board?.local?.winner ?? -1) >= 0) return;

  const actor = currentActor(world);
  if (!actor || actor.local?.side !== SIDE_PLAYER) return;

  const cols = board?.local?.cols ?? world.width;
  const rows = board?.local?.rows ?? world.height;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (canAttack(world, actor, x, y)) {
        ctx.fillStyle = "rgba(220, 90, 70, 0.45)";
        ctx.fillRect(x, y, 1, 1);
      } else if (canMove(world, actor, x, y)) {
        ctx.fillStyle = "rgba(90, 160, 220, 0.4)";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function orderIndex(world: World, e: Entity): number {
  const side = e.local?.side ?? -1;
  const order = squadOrder(world, side);
  return order.findIndex((u) => u.id === e.id) + 1;
}

function unitMark(fill: string, stroke: string, label: string): Mark {
  return (ctx, e, world) => {
    const actor = currentActor(world);
    const isNow = actor?.id === e.id;
    const spent = !!e.local?.acted;
    const hp = e.local?.hp ?? 0;
    const slot = orderIndex(world, e);

    if (isNow) {
      ctx.strokeStyle = "#f5f0c8";
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 0.48, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = spent ? 0.35 : isNow ? 1 : 0.72;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.06;
    ctx.stroke();

    ctx.fillStyle = stroke;
    ctx.font = "0.26px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spent ? "done" : `${label}${slot}`, e.x, e.y - 0.12);
    ctx.font = "0.32px monospace";
    ctx.fillText(String(hp), e.x, e.y + 0.14);
    ctx.globalAlpha = 1;
  };
}

function paintOrderChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  opts: { fill: string; stroke: string; now: boolean; spent: boolean },
): number {
  ctx.font = opts.now ? "600 13px monospace" : "12px monospace";
  const padX = 10;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 26;

  ctx.globalAlpha = opts.spent ? 0.35 : 1;
  ctx.fillStyle = opts.fill;
  ctx.strokeStyle = opts.now ? "#f5f0c8" : opts.stroke;
  ctx.lineWidth = opts.now ? 2 : 1;
  ctx.beginPath();
  // Simple chip — avoid roundRect for older canvas paths
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = opts.stroke;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.globalAlpha = 1;

  if (opts.now) {
    ctx.fillStyle = "#f5f0c8";
    ctx.font = "600 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("NOW", x + w / 2, y - 2);
  }

  return w;
}

function paintTurnOrder(
  ctx: CanvasRenderingContext2D,
  world: World,
  y: number,
): void {
  const actor = currentActor(world);
  const you = squadOrder(world, SIDE_PLAYER);
  const foes = squadOrder(world, SIDE_ENEMY);
  let x = 16;

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(220,230,200,0.55)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Order", x, y + 13);
  x += 52;

  for (let i = 0; i < you.length; i++) {
    const u = you[i]!;
    const w = paintOrderChip(ctx, x, y, `YOU ${i + 1}`, {
      fill: "#2a4a34",
      stroke: "#b8e0c0",
      now: actor?.id === u.id,
      spent: !!u.local?.acted,
    });
    x += w + 6;
    if (i < you.length - 1) {
      ctx.fillStyle = "rgba(220,230,200,0.45)";
      ctx.fillText("→", x, y + 13);
      x += 16;
    }
  }

  ctx.fillStyle = "rgba(220,230,200,0.45)";
  ctx.fillText("│", x + 4, y + 13);
  x += 22;

  for (let i = 0; i < foes.length; i++) {
    const u = foes[i]!;
    const w = paintOrderChip(ctx, x, y, `FOE ${i + 1}`, {
      fill: "#4a2a28",
      stroke: "#e0b8b0",
      now: actor?.id === u.id,
      spent: !!u.local?.acted,
    });
    x += w + 6;
    if (i < foes.length - 1) {
      ctx.fillStyle = "rgba(220,230,200,0.45)";
      ctx.fillText("→", x, y + 13);
      x += 16;
    }
  }
}

function paintChrome(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: View,
  color: string,
): void {
  const board = boardOf(world);
  const turn = board?.local?.turnSide ?? 0;
  const winner = board?.local?.winner ?? -1;
  const round = board?.local?.turnIndex ?? 1;
  const actor = currentActor(world);
  const focusHp = actor?.local?.hp;

  let phase: string;
  let next: string;
  if (winner === SIDE_PLAYER) {
    phase = `Round ${round} · YOU WIN`;
    next = "Press N for a new seed.";
  } else if (winner === SIDE_ENEMY) {
    phase = `Round ${round} · ENEMY WINS`;
    next = "Press N for a new seed.";
  } else if (turn === SIDE_PLAYER) {
    const slot = actor ? orderIndex(world, actor) : 0;
    phase = `Round ${round} · YOUR PHASE · acting YOU ${slot}`;
    next = actor
      ? `Only YOU ${slot} (HP ${focusHp}) may act — blue move · red attack · W wait — then order advances`
      : "No ready units.";
  } else {
    const slot = actor ? orderIndex(world, actor) : 0;
    phase = `Round ${round} · ENEMY PHASE · acting FOE ${slot}`;
    next = "Fixed order: each FOE acts once, then back to YOU 1.";
  }

  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "600 15px monospace";
  ctx.fillText(phase, 16, 12);
  ctx.font = "13px monospace";
  ctx.fillText(next, 16, 34);

  paintTurnOrder(ctx, world, 58);

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(220,230,200,0.5)";
  ctx.fillText(
    "Turn order is fixed: YOU 1→2 then FOE 1→2 each round. Ring + NOW chip = who must act.",
    16,
    view.height - 52,
  );
}

function frameTactics(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: View,
  _cam: { x: number; y: number },
  entities: () => void,
  opts: {
    ground: string;
    ink: string;
    odd: string;
    solid: string;
    chrome: string;
  },
): void {
  ctx.fillStyle = opts.ground;
  ctx.fillRect(0, 0, view.width, view.height);

  const s = cellSize(world, view);
  const origin = boardOrigin(world, view);
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.scale(s, s);
  paintBoardGrid(ctx, world, opts.ink, opts.odd, opts.solid);
  paintLegalCells(ctx, world);
  entities();
  ctx.restore();

  paintChrome(ctx, world, view, opts.chrome);
}

const tactics: Style = {
  name: "tactics",
  frame: (ctx, world, view, cam, entities) =>
    frameTactics(ctx, world, view, cam, entities, {
      ground: "#12160f",
      ink: "#1c2418",
      odd: "#243020",
      solid: "#3a3428",
      chrome: "rgba(220,230,200,0.85)",
    }),
  marks: {
    board: () => {},
    soldier: unitMark("#6ecf8e", "#0d1a10", "Y"),
    enemy: unitMark("#d87a6a", "#1a0d0d", "F"),
  },
  unknown: markUnknown,
};

const glyphs: Style = {
  name: "glyphs",
  frame: (ctx, world, view, cam, entities) =>
    frameTactics(ctx, world, view, cam, entities, {
      ground: "#0e0e12",
      ink: "#16161c",
      odd: "#1c1c24",
      solid: "#2a2a36",
      chrome: "rgba(200,200,220,0.85)",
    }),
  marks: {
    board: () => {},
    soldier: unitMark("#b8f0c8", "#0d1a10", "Y"),
    enemy: unitMark("#f0b8b0", "#1a0d0d", "F"),
  },
  unknown: markUnknown,
};

export const styles: Style[] = [tactics, glyphs];
