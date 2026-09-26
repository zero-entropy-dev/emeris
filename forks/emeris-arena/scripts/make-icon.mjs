/**
 * Paint public/favicon.ico from the arena mark — a stalker in the crosshair
 * (no extra deps). Run: npm run icon
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 32;
const NIGHT = [0x0a, 0x0e, 0x16, 255];
const FOG = [0x1c, 0x28, 0x38, 255];
const STALKER = [0x8a, 0x30, 0x40, 255];
const HEAD = [0xd8, 0xa0, 0xaa, 255];
const STEEL = [0xc8, 0xd8, 0xe8, 235];
const HIT = [0xff, 0x56, 0x4a, 255];

const px = new Uint8Array(SIZE * SIZE * 4);

function set(x, y, c) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const a = c[3] / 255;
  if (a >= 1) {
    px[i] = c[0];
    px[i + 1] = c[1];
    px[i + 2] = c[2];
    px[i + 3] = 255;
    return;
  }
  px[i] = Math.round(c[0] * a + px[i] * (1 - a));
  px[i + 1] = Math.round(c[1] * a + px[i + 1] * (1 - a));
  px[i + 2] = Math.round(c[2] * a + px[i + 2] * (1 - a));
  px[i + 3] = 255;
}

function fill(c) {
  for (let i = 0; i < SIZE * SIZE; i++) {
    const o = i * 4;
    px[o] = c[0];
    px[o + 1] = c[1];
    px[o + 2] = c[2];
    px[o + 3] = c[3];
  }
}

function disc(cx, cy, r, c) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) set(x, y, c);
    }
  }
}

function ellipse(cx, cy, rx, ry, c) {
  const pad = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - pad); y <= Math.ceil(cy + pad); y++) {
    for (let x = Math.floor(cx - pad); x <= Math.ceil(cx + pad); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) set(x, y, c);
    }
  }
}

function rect(x0, y0, x1, y1, c) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c);
}

function stroke(points, width, c) {
  const half = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, half, c);
    }
  }
}

fill(NIGHT);
rect(0, 18, SIZE, SIZE, FOG);
ellipse(16, 18, 3.6, 8.6, STALKER);
ellipse(16, 12, 2.8, 2.2, HEAD);

// Crosshair: four arms with a gap, and a centre dot.
rect(4, 15, 12, 17, STEEL);
rect(20, 15, 28, 17, STEEL);
rect(15, 4, 17, 12, STEEL);
rect(15, 20, 17, 28, STEEL);
disc(16, 16, 1.1, STEEL);

// Hit-marker ticks.
stroke([[9, 9], [6, 6]], 1.4, HIT);
stroke([[23, 9], [26, 6]], 1.4, HIT);
stroke([[9, 23], [6, 26]], 1.4, HIT);
stroke([[23, 23], [26, 26]], 1.4, HIT);

/** BMP-in-ICO so WinForms `new Icon()` accepts the file. */
function icoOf(rgba, size) {
  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const srcY = size - 1 - y;
    for (let x = 0; x < size; x++) {
      const s = (srcY * size + x) * 4;
      const d = (y * size + x) * 4;
      xor[d] = rgba[s + 2];
      xor[d + 1] = rgba[s + 1];
      xor[d + 2] = rgba[s];
      xor[d + 3] = rgba[s + 3];
    }
  }
  const andRow = ((size + 31) >> 5) * 4;
  const andMask = Buffer.alloc(andRow * size);
  const dib = Buffer.alloc(40);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(size, 4);
  dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(xor.length, 20);

  const image = Buffer.concat([dib, xor, andMask]);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = size;
  header[7] = size;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(image.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, image]);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
writeFileSync(join(dir, "favicon.ico"), icoOf(px, SIZE));
console.log("wrote public/favicon.ico");
