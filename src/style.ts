/**
 * Programmable look. Reinterpret the whole world without rewriting entities.
 *
 * Marks may read the world but must never mutate it, and must never draw from
 * the world RNG. Jitter derives from entity id + tick so render cannot break replay.
 * Same laws apply to `frame` (backdrop + chrome around the entity pass).
 */

import { dayOf, type Entity, type Identity, type World } from "./sim";

/** Host viewport in CSS pixels — observer only, never written into World. */
export type View = { width: number; height: number };

export type Mark = (
  ctx: CanvasRenderingContext2D,
  e: Entity,
  world: World,
) => void;

export type Style = {
  name: string;
  /**
   * Own the full picture: viewport backdrop, camera-transformed world pass,
   * then screen-space chrome. Still Style — not a sixth concept.
   */
  frame: (
    ctx: CanvasRenderingContext2D,
    world: World,
    view: View,
    cam: { x: number; y: number },
    entities: () => void,
  ) => void;
  marks: Partial<Record<Identity, Mark>>;
  /** Identities this style has no opinion about. */
  unknown: Mark;
};

/** Stable [0, 1) from id + tick — not the world RNG. */
function visualHash(id: number, tick: number, salt = 0): number {
  let t = Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(tick + salt, 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function markUnknown(ctx: CanvasRenderingContext2D, e: Entity): void {
  ctx.fillStyle = "#ff00aa";
  ctx.beginPath();
  ctx.arc(e.x, e.y - 6, 6, 0, Math.PI * 2);
  ctx.fill();
}

function timeOfDayWord(cycle: number): string {
  if (cycle < 0.2 || cycle >= 0.85) return "night";
  if (cycle < 0.3) return "dawn";
  if (cycle < 0.65) return "day";
  return "dusk";
}

function paintChrome(
  ctx: CanvasRenderingContext2D,
  world: World,
  ink: string,
  muted: string,
): void {
  ctx.fillStyle = muted;
  ctx.font = "14px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const cycle = dayOf(world)?.local?.cycle ?? 0;
  const creatures = world.entities.filter((e) => e.identity === "creature");
  const grasses = world.entities.filter((e) => e.identity === "grass");
  const flowers = world.entities.filter((e) => e.identity === "flower");
  const cover =
    grasses.length === 0
      ? 0
      : grasses.reduce((s, g) => s + (g.local?.amount ?? 0), 0) / grasses.length;
  const meanFullness =
    creatures.length === 0
      ? 0
      : creatures.reduce((s, c) => s + (c.local?.fullness ?? 0), 0) /
        creatures.length;
  const blooming = flowers.filter((f) => f.local?.bloomed).length;

  ctx.fillText("Observing — meadow", 16, 16);
  ctx.fillStyle = muted;
  ctx.fillText(
    `${timeOfDayWord(cycle)} · creatures ${creatures.length} · fullness ${meanFullness.toFixed(2)} · grass ${(cover * 100).toFixed(0)}% · flowers ${flowers.length}${blooming ? ` (${blooming} open)` : ""}`,
    16,
    36,
  );
  void ink;
}

function makeFrame(
  background: string,
  ground: string,
  ink: string,
  muted: string,
): Style["frame"] {
  return (ctx, world, view, cam, entities) => {
    const cycle = dayOf(world)?.local?.cycle ?? 0.5;
    const night = cycle < 0.18 || cycle >= 0.82;
    const dusk = !night && (cycle < 0.28 || cycle >= 0.68);

    // Full-bleed ground — the world is the meadow, not a stage ellipse.
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.restore();

    if (night) {
      ctx.fillStyle = "rgba(12, 16, 36, 0.42)";
      ctx.fillRect(0, 0, view.width, view.height);
    } else if (dusk) {
      ctx.fillStyle = "rgba(36, 24, 48, 0.22)";
      ctx.fillRect(0, 0, view.width, view.height);
    }

    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    entities();
    ctx.restore();

    ctx.save();
    paintChrome(ctx, world, ink, muted);
    ctx.restore();
  };
}

function proceduralTree(
  canopy: string,
  trunk: string,
  markScale: number,
): Mark {
  return (ctx, e) => {
    const s = markScale;
    const trunkH = 28 * s;
    const canopyR = 22 * s;
    const { x, y } = e;

    ctx.strokeStyle = trunk;
    ctx.lineWidth = 4 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - trunkH);
    ctx.stroke();

    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.arc(x, y - trunkH - canopyR * 0.35, canopyR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - canopyR * 0.55, y - trunkH, canopyR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + canopyR * 0.55, y - trunkH, canopyR * 0.7, 0, Math.PI * 2);
    ctx.fill();
  };
}

function proceduralGrass(blade: string, markScale: number): Mark {
  return (ctx, e) => {
    const s = markScale;
    const amount = e.local?.amount ?? 0;
    if (amount < 0.02) return;
    const h = 4 + amount * 18;
    const w = 1.2 + amount * 1.2;
    ctx.globalAlpha = 0.3 + amount * 0.7;
    ctx.strokeStyle = blade;
    ctx.lineWidth = w * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x - 4 * s, e.y - h * s);
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + 1 * s, e.y - h * 0.95 * s);
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + 5 * s, e.y - h * 0.75 * s);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
}

function proceduralFlower(
  bud: string,
  bloom: string,
  wilt: string,
  markScale: number,
): Mark {
  return (ctx, e) => {
    const s = markScale;
    const amount = e.local?.amount ?? 0;
    const bloomed = e.local?.bloomed === true;
    const age = e.local?.age ?? 0;
    const wilting = bloomed && age > 9;

    ctx.strokeStyle = bud;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x, e.y - (8 + amount * 6) * s);
    ctx.stroke();

    const headY = e.y - (10 + amount * 8) * s;
    if (!bloomed) {
      ctx.fillStyle = bud;
      ctx.beginPath();
      ctx.ellipse(e.x, headY, 3 * s * (0.5 + amount), 4 * s * (0.5 + amount), 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (wilting) {
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = wilt;
    } else {
      ctx.fillStyle = bloom;
    }
    const r = 5 * s;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        e.x + Math.cos(a) * r * 0.7,
        headY + Math.sin(a) * r * 0.7,
        r * 0.55,
        r * 0.35,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = wilting ? wilt : "#f5e6a0";
    ctx.beginPath();
    ctx.arc(e.x, headY, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };
}

/**
 * Fullness must read at a glance: body size scales with fullness;
 * a belly fill bar; hungry creatures get a clear accent ring.
 */
function proceduralCreature(
  body: string,
  accent: string,
  markScale: number,
): Mark {
  return (ctx, e, world) => {
    const s = markScale;
    const fullness = e.local?.fullness ?? 0;
    const r = (5 + fullness * 7) * s;
    const lean = (visualHash(e.id, world.tick, 3) - 0.5) * 0.15;
    const hungry = fullness < 0.45;

    ctx.save();
    ctx.translate(e.x, e.y - r);
    ctx.rotate(e.facing + lean);

    ctx.fillStyle = body;
    ctx.globalAlpha = 0.55 + fullness * 0.45;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Belly fullness meter (visible on every creature).
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 0.9 * fullness, r * 0.35 * fullness, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(r * 0.85, -r * 0.2, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    if (hungry) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.55 + (0.45 - fullness);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };
}

const markDay: Mark = () => {};

function makeProceduralStyle(
  name: string,
  palette: {
    background: string;
    ground: string;
    treeCanopy: string;
    treeTrunk: string;
    creatureBody: string;
    creatureAccent: string;
    grassBlade: string;
    flowerBud: string;
    flowerBloom: string;
    flowerWilt: string;
    chromeInk: string;
    chromeMuted: string;
    markScale: number;
  },
): Style {
  return {
    name,
    frame: makeFrame(
      palette.background,
      palette.ground,
      palette.chromeInk,
      palette.chromeMuted,
    ),
    marks: {
      day: markDay,
      tree: proceduralTree(
        palette.treeCanopy,
        palette.treeTrunk,
        palette.markScale,
      ),
      grass: proceduralGrass(palette.grassBlade, palette.markScale),
      flower: proceduralFlower(
        palette.flowerBud,
        palette.flowerBloom,
        palette.flowerWilt,
        palette.markScale,
      ),
      creature: proceduralCreature(
        palette.creatureBody,
        palette.creatureAccent,
        palette.markScale,
      ),
    },
    unknown: markUnknown,
  };
}

const glyphTree: Mark = (ctx, e, world) => {
  const lean = (visualHash(e.id, world.tick, 3) - 0.5) * 0.25;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(lean);
  ctx.fillStyle = "#3d6b45";
  ctx.font = "28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("↑", 0, 0);
  ctx.restore();
};

const glyphGrass: Mark = (ctx, e) => {
  const amount = e.local?.amount ?? 0;
  if (amount < 0.05) return;
  ctx.globalAlpha = 0.35 + amount * 0.65;
  ctx.fillStyle = "#4a7a42";
  ctx.font = `${12 + Math.floor(amount * 8)}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(amount > 0.7 ? ",," : amount > 0.35 ? "," : ".", e.x, e.y);
  ctx.globalAlpha = 1;
};

const glyphFlower: Mark = (ctx, e) => {
  const bloomed = e.local?.bloomed === true;
  const wilting = bloomed && (e.local?.age ?? 0) > 9;
  ctx.fillStyle = wilting ? "#888" : bloomed ? "#b33a6a" : "#5a7a4a";
  ctx.font = "16px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(bloomed ? (wilting ? "x" : "*") : ".", e.x, e.y);
};

const glyphCreature: Mark = (ctx, e) => {
  const fullness = e.local?.fullness ?? 0;
  ctx.fillStyle = fullness < 0.35 ? "#8b1e1e" : fullness < 0.6 ? "#5a4a2a" : "#1a1a1a";
  ctx.font = `bold ${14 + Math.floor(fullness * 8)}px ui-monospace, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyph = fullness < 0.35 ? "o" : fullness < 0.7 ? "a" : "@";
  ctx.fillText(glyph, e.x, e.y - 6);
};

export const glyphs: Style = {
  name: "glyphs",
  frame: makeFrame("#f4f0e6", "#e8e0d0", "#1a1a1a", "#666"),
  marks: {
    day: markDay,
    tree: glyphTree,
    grass: glyphGrass,
    flower: glyphFlower,
    creature: glyphCreature,
  },
  unknown: (ctx, e) => {
    ctx.fillStyle = "#888";
    ctx.font = "14px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("?", e.x, e.y);
  },
};

export const styles: Style[] = [
  makeProceduralStyle("meadow", {
    background: "#1a2a1f",
    ground: "#2d4a38",
    treeCanopy: "#5a9a62",
    treeTrunk: "#5c4030",
    creatureBody: "#e8d5a3",
    creatureAccent: "#c45c26",
    grassBlade: "#6b9a58",
    flowerBud: "#6b8f71",
    flowerBloom: "#e8a0c0",
    flowerWilt: "#8a7a6a",
    chromeInk: "#e8e0d0",
    chromeMuted: "#a8b89a",
    markScale: 1,
  }),
  makeProceduralStyle("night ink", {
    background: "#0e1420",
    ground: "#1a2433",
    treeCanopy: "#3d5a6b",
    treeTrunk: "#2a3340",
    creatureBody: "#f0e6d2",
    creatureAccent: "#7eb8da",
    grassBlade: "#4a6a58",
    flowerBud: "#4a5568",
    flowerBloom: "#c9a0dc",
    flowerWilt: "#6a6a7a",
    chromeInk: "#d0d8e8",
    chromeMuted: "#8a9aac",
    markScale: 1,
  }),
  makeProceduralStyle("chalk", {
    background: "#1a1a1a",
    ground: "#2a2a2a",
    treeCanopy: "#888",
    treeTrunk: "#555",
    creatureBody: "#1a1a1a",
    creatureAccent: "#b33a3a",
    grassBlade: "#6a6a6a",
    flowerBud: "#6a6a6a",
    flowerBloom: "#b33a3a",
    flowerWilt: "#555",
    chromeInk: "#eee",
    chromeMuted: "#999",
    markScale: 1.05,
  }),
  glyphs,
];
