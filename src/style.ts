/**
 * Programmable look. Reinterpret the whole world without rewriting entities.
 *
 * Marks may read the world but must never mutate it, and must never draw from
 * the world RNG. Jitter derives from entity id + tick so render cannot break replay.
 * Same laws apply to `frame` (backdrop + chrome around the entity pass).
 */

import {
  gardenComplete,
  nearest,
  type Entity,
  type Identity,
  type World,
} from "./sim";

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

/** Stable [0, 1) from id + tick — not the sim RNG. */
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

function drawControlledRing(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  world: World,
  color: string,
  scale: number,
): void {
  if (e.id !== world.controlledId) return;
  const pulse = 0.65 + 0.35 * Math.sin(world.tick * 0.12);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55 + 0.35 * pulse;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(e.x, e.y - 10 * scale, 16 * scale * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function paintChrome(
  ctx: CanvasRenderingContext2D,
  world: World,
  ink: string,
  muted: string,
): void {
  const awake = gardenComplete(world);
  const garden =
    world.flowerGoal > 0
      ? `Bloomed ${world.flowerBloomed}/${world.flowerGoal}`
      : "";
  const gathered =
    world.flowerGathered > 0 ? ` · gathered ${world.flowerGathered}` : "";
  const regrowing =
    (world.flowerRegrows?.length ?? 0) > 0
      ? ` · regrowing ${world.flowerRegrows!.length}`
      : "";

  ctx.fillStyle = muted;
  ctx.font = "14px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (world.phase === "playing") {
    if (!awake) {
      ctx.fillText("Bloom all flowers to wake the beacon", 16, 16);
      if (garden) {
        ctx.fillText(
          `${garden}${gathered}${regrowing} · walk near buds`,
          16,
          36,
        );
      }
    } else {
      ctx.fillText("Reach the beacon", 16, 16);
      ctx.fillText(
        `${garden} — garden full${gathered}${regrowing} · gather blooms`,
        16,
        36,
      );
    }
  } else {
    ctx.fillStyle = ink;
    ctx.font = "22px Georgia, 'Times New Roman', serif";
    ctx.fillText("Reached.", 16, 16);
    ctx.fillStyle = muted;
    ctx.font = "14px Georgia, 'Times New Roman', serif";
    ctx.fillText(
      garden
        ? `${garden}${gathered}${regrowing} · N — new meadow`
        : "N — new meadow",
      16,
      44,
    );
  }
}

function makeFrame(
  background: string,
  ground: string,
  ink: string,
  muted: string,
): Style["frame"] {
  return (ctx, world, view, cam, entities) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.ellipse(
      world.width * 0.5,
      world.height * 0.72,
      world.width * 0.48,
      world.height * 0.32,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Spent patches — World slice data, not a Mark identity.
    const patches = world.flowerRegrows ?? [];
    for (const p of patches) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = muted;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

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

function proceduralWalker(
  body: string,
  accent: string,
  markScale: number,
): Mark {
  return (ctx, e, world) => {
    const s = markScale;
    const r = 10 * s;
    const { x, y, facing } = e;

    drawControlledRing(ctx, e, world, accent, s);

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y - r, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(
      x + Math.cos(facing) * r * 1.4,
      y - r + Math.sin(facing) * r * 1.4,
    );
    ctx.stroke();
  };
}

function proceduralBeacon(glow: string, core: string, markScale: number): Mark {
  return (ctx, e, world) => {
    const s = markScale;
    const awake = gardenComplete(world);
    const pulse = 0.75 + 0.25 * Math.sin(world.tick * 0.08 + e.id);
    if (awake) {
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.25 * pulse;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 8 * s, 26 * s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 8 * s, 8 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 8 * s, 14 * s, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 8 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 8 * s, 11 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };
}

/**
 * Appearance-only alarm: distance + `local.alarm` + visualHash.
 * Marks read the world; they never write it or touch sim RNG.
 */
function proceduralCritter(
  body: string,
  accent: string,
  markScale: number,
): Mark {
  return (ctx, e, world) => {
    const s = markScale;
    const threat = nearest(world, "walker", e.x, e.y);
    let proximity = 0;
    if (threat) {
      const dist = Math.hypot(e.x - threat.x, e.y - threat.y);
      proximity = Math.max(0, 1 - dist / 100);
    }
    const memory = Math.min(1, (e.local?.alarm ?? 0) / 2.4);
    const startle = Math.max(proximity, memory);
    const flick = (visualHash(e.id, world.tick, 7) - 0.5) * 0.4 * startle;
    const crouch = 1 - 0.25 * startle;
    const r = 5.5 * s * crouch;

    ctx.save();
    ctx.translate(e.x, e.y - r);
    ctx.rotate(e.facing + flick);

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.35, r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(r * 0.9, -r * 0.35, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (startle > 0.35) {
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.35 + 0.4 * startle;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.6 + 0.4 * startle), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };
}

function proceduralFlower(
  bud: string,
  bloom: string,
  stem: string,
  markScale: number,
): Mark {
  return (ctx, e, world) => {
    const s = markScale;
    const open = e.local?.bloomed === true;
    ctx.strokeStyle = stem;
    ctx.lineWidth = 2 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x, e.y - 14 * s);
    ctx.stroke();

    if (open) {
      const pulse = 0.85 + 0.15 * Math.sin(world.tick * 0.14 + e.id);
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 16 * s, 8 * s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(e.x, e.y - 16 * s, 12 * s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = bud;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y - 15 * s, 4 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

function makeProceduralStyle(
  name: string,
  palette: {
    background: string;
    ground: string;
    treeCanopy: string;
    treeTrunk: string;
    walkerBody: string;
    walkerAccent: string;
    beaconGlow: string;
    beaconCore: string;
    critterBody: string;
    critterAccent: string;
    flowerBud: string;
    flowerBloom: string;
    flowerStem: string;
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
      tree: proceduralTree(
        palette.treeCanopy,
        palette.treeTrunk,
        palette.markScale,
      ),
      walker: proceduralWalker(
        palette.walkerBody,
        palette.walkerAccent,
        palette.markScale,
      ),
      beacon: proceduralBeacon(
        palette.beaconGlow,
        palette.beaconCore,
        palette.markScale,
      ),
      critter: proceduralCritter(
        palette.critterBody,
        palette.critterAccent,
        palette.markScale,
      ),
      flower: proceduralFlower(
        palette.flowerBud,
        palette.flowerBloom,
        palette.flowerStem,
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

const glyphWalker: Mark = (ctx, e, world) => {
  drawControlledRing(ctx, e, world, "#b33a3a", 1);
  ctx.save();
  ctx.translate(e.x, e.y - 8);
  ctx.rotate(e.facing);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "bold 18px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("@", 0, 0);
  ctx.restore();
};

const glyphBeacon: Mark = (ctx, e, world) => {
  const awake = gardenComplete(world);
  const pulse = awake ? 0.85 + 0.15 * Math.sin(world.tick * 0.1) : 0.7;
  ctx.save();
  ctx.translate(e.x, e.y - 6);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = awake ? 1 : 0.35;
  ctx.fillStyle = awake ? "#8b1e1e" : "#888";
  ctx.font = "26px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(awake ? "★" : "☆", 0, 0);
  ctx.restore();
};

/** Glyphs once fell through to unknown (pink/?) — style coupling measured, then filled. */
const glyphCritter: Mark = (ctx, e, world) => {
  const threat = nearest(world, "walker", e.x, e.y);
  let startle = Math.min(1, (e.local?.alarm ?? 0) / 2.4);
  if (threat) {
    const dist = Math.hypot(e.x - threat.x, e.y - threat.y);
    startle = Math.max(startle, Math.max(0, 1 - dist / 100));
  }
  const jitter = (visualHash(e.id, world.tick, 5) - 0.5) * 6 * startle;
  ctx.fillStyle = startle > 0.4 ? "#8b1e1e" : "#3a3a3a";
  ctx.font = "16px ui-monospace, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("~", e.x + jitter, e.y);
};

const glyphFlower: Mark = (ctx, e) => {
  const open = e.local?.bloomed === true;
  ctx.fillStyle = open ? "#8b1e1e" : "#5a5a5a";
  ctx.font = "16px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(open ? "*" : ".", e.x, e.y);
};

const glyphs: Style = {
  name: "glyphs",
  frame: makeFrame("#f4f0e6", "#e0d9c8", "#1a1a1a", "#5a5a5a"),
  marks: {
    tree: glyphTree,
    walker: glyphWalker,
    beacon: glyphBeacon,
    critter: glyphCritter,
    flower: glyphFlower,
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
    walkerBody: "#e8d5a3",
    walkerAccent: "#c45c26",
    beaconGlow: "#e8c547",
    beaconCore: "#f5f0d0",
    critterBody: "#c4a574",
    critterAccent: "#8b5a2b",
    flowerBud: "#6b8f71",
    flowerBloom: "#e8a0c0",
    flowerStem: "#4a6b40",
    chromeInk: "#f0e6d2",
    chromeMuted: "rgba(240, 230, 210, 0.65)",
    markScale: 1,
  }),
  makeProceduralStyle("night ink", {
    background: "#0c0e14",
    ground: "#161b28",
    treeCanopy: "#8fa4c8",
    treeTrunk: "#4a5568",
    walkerBody: "#f0e6d2",
    walkerAccent: "#7eb8da",
    beaconGlow: "#d4a574",
    beaconCore: "#f5e6d0",
    critterBody: "#a8b4c8",
    critterAccent: "#6a8aaa",
    flowerBud: "#4a5568",
    flowerBloom: "#c9a0dc",
    flowerStem: "#3d4a5c",
    chromeInk: "#e8e4d9",
    chromeMuted: "rgba(232, 228, 217, 0.6)",
    markScale: 0.85,
  }),
  makeProceduralStyle("chalk", {
    background: "#e8e4d9",
    ground: "#d4cfc0",
    treeCanopy: "#3a3a3a",
    treeTrunk: "#5a5a5a",
    walkerBody: "#1a1a1a",
    walkerAccent: "#b33a3a",
    beaconGlow: "#b33a3a",
    beaconCore: "#1a1a1a",
    critterBody: "#4a4a4a",
    critterAccent: "#b33a3a",
    flowerBud: "#6a6a6a",
    flowerBloom: "#b33a3a",
    flowerStem: "#5a5a5a",
    chromeInk: "#1a1a1a",
    chromeMuted: "rgba(26, 26, 26, 0.55)",
    markScale: 1.15,
  }),
  glyphs,
];
