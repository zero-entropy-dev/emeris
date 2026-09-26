/**
 * Wall textures generated in code at load. Observer-only; no image files.
 * Noise comes from an integer hash, never from world RNG.
 */

export const TEX = 64;

/** Row-major RGB triples, TEX × TEX. */
export type Texture = Uint8Array;

function hash(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function make(paint: (x: number, y: number) => [number, number, number]): Texture {
  const t = new Uint8Array(TEX * TEX * 3);
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * TEX + x) * 3;
      t[i] = clamp(r);
      t[i + 1] = clamp(g);
      t[i + 2] = clamp(b);
    }
  }
  return t;
}

const STEEL: [number, number, number] = [150, 168, 188];

function panel(x: number, y: number, salt: number): [number, number, number] {
  const n = (hash(x, y, salt) - 0.5) * 22;
  const px = x % 32;
  const py = y % 32;
  let k = 1;
  if (px === 0 || py === 0) k = 0.45;
  else if (px === 1 || py === 1) k = 1.18;
  else if (px === 31 || py === 31) k = 0.72;
  const rivet =
    (px === 4 || px === 27) && (py === 4 || py === 27) ? 1.35 : 1;
  const [r, g, b] = STEEL;
  return [r * k * rivet + n, g * k * rivet + n, b * k * rivet + n];
}

/** Steel panels with seams and rivets. */
export const steel = make((x, y) => panel(x, y, 1));

/** Panels with drips and dark streaks running down. */
export const grime = make((x, y) => {
  const [r, g, b] = panel(x, y, 2);
  const streak = hash(x, 0, 7);
  const drip = streak > 0.72 ? (y / TEX) * (streak - 0.72) * 2.6 : 0;
  const blot = hash(x >> 2, y >> 2, 9) > 0.86 ? 0.22 : 0;
  const k = 1 - Math.min(0.6, drip + blot + (y / TEX) * 0.12);
  return [r * k * 0.92, g * k * 0.95, b * k];
});

/** Panel with a band of worn hazard stripes across the middle. */
export const stripes = make((x, y) => {
  if (y < 22 || y > 41) return panel(x, y, 3);
  if (y === 22 || y === 41) return [52, 56, 62];
  const band = Math.floor((x + y) / 6) % 2 === 0;
  const wear = (hash(x, y, 5) - 0.5) * 28;
  return band
    ? [176 + wear, 146 + wear, 64 + wear * 0.5]
    : [38 + wear * 0.3, 40 + wear * 0.3, 44 + wear * 0.3];
});

/** Which texture a wall cell uses. Stable per cell. */
export function textureFor(cellX: number, cellY: number): Texture {
  const h = hash(cellX, cellY, 11);
  if (h < 0.1) return stripes;
  if (h < 0.4) return grime;
  return steel;
}
