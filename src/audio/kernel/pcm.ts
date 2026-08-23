/** Sample-accurate ops. No Web Audio. No Math.random. */

import { SAMPLE_RATE, samples, unit } from "./grain";

export type Sample = Float32Array;
export type Wave = "sine" | "triangle";

export function alloc(seconds: number): Sample {
  return new Float32Array(samples(seconds));
}

export function mix(parts: Sample[]): Sample {
  let n = 0;
  for (const p of parts) if (p.length > n) n = p.length;
  const out = new Float32Array(n);
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) out[i]! += p[i]!;
  }
  return out;
}

export function gain(src: Sample, amp: number): Sample {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i]! * amp;
  return out;
}

export function envelope(length: number, attack: number, peak: number): Sample {
  const out = new Float32Array(length);
  const a = Math.max(1, Math.floor(attack * SAMPLE_RATE));
  const tau = Math.max(1, length - a);
  for (let i = 0; i < length; i++) {
    if (i < a) out[i] = peak * (i / a);
    else out[i] = peak * Math.exp(-2.2 * ((i - a) / tau));
  }
  return out;
}

function waveAt(kind: Wave, phase: number): number {
  const t = phase - Math.floor(phase);
  if (kind === "triangle") return t < 0.5 ? t * 4 - 1 : 3 - t * 4;
  return Math.sin(t * Math.PI * 2);
}

export function osc(kind: Wave, freq: number, seconds: number, amp: number, attack = 0.006): Sample {
  const n = samples(seconds);
  const env = envelope(n, attack, amp);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    out[i] = waveAt(kind, phase) * env[i]!;
    phase += freq / SAMPLE_RATE;
  }
  return out;
}

/** Seeded white or brown noise. */
export function noise(seconds: number, seed: number, brown: boolean, amp: number): Sample {
  const n = samples(seconds);
  const out = new Float32Array(n);
  let state = seed >>> 0 || 1;
  let walk = 0;
  for (let i = 0; i < n; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const w = state / 4294967296 * 2 - 1;
    if (brown) {
      walk = (walk + w * 0.018) / 1.018;
      out[i] = Math.max(-1, Math.min(1, walk * 3.4)) * amp;
    } else {
      out[i] = w * amp;
    }
  }
  return out;
}

export function peakOf(src: Sample): number {
  let p = 0;
  for (let i = 0; i < src.length; i++) p = Math.max(p, Math.abs(src[i]!));
  return p;
}

export function same(a: Sample, b: Sample): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function jitter(seed: number, lane: number, amount: number): number {
  return 1 + (unit(seed, lane) * 2 - 1) * amount;
}
