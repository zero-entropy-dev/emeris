/**
 * Lighting as Style data. Same shape as the meadow recipe.
 * Stays in the arena until a second world needs the shared one.
 */

export type LightingRecipe = {
  /** Backdrop / ceiling ink. */
  fill: string;
  /** Floor ink. */
  ground: string;
  /** Distance veil. Alpha is fog strength. */
  fog: string;
  /** Optional key direction. Canvas may ignore it. */
  key?: { x: number; y: number };
};

export type Rgba = { r: number; g: number; b: number; a: number };

/** How far (world cells) before a wall is fully fog. */
export const FOG_DISTANCE = 14;

/** Cold industrial night. */
export const arenaLight: LightingRecipe = {
  fill: "#070b12",
  ground: "#05070c",
  fog: "rgba(6, 10, 18, 0.85)",
  key: { x: 0.2, y: -0.4 },
};

const parsed = new Map<string, Rgba>();

/** Parse a hex or rgb(a) colour once. Later calls reuse the same numbers. */
export function rgbaOf(color: string): Rgba {
  const cached = parsed.get(color);
  if (cached) return cached;
  let out: Rgba = { r: 0, g: 0, b: 0, a: 1 };
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const n = Number.parseInt(hex[1]!, 16);
    out = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  } else {
    const m =
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
        color.trim(),
      );
    if (m) {
      out = {
        r: Number(m[1]),
        g: Number(m[2]),
        b: Number(m[3]),
        a: m[4] !== undefined ? Number(m[4]) : 1,
      };
    }
  }
  parsed.set(color, out);
  return out;
}
