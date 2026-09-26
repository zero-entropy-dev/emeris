/** Sample-accurate ops. No Web Audio. No Math.random. */

import { SAMPLE_RATE, samples, unit } from "./grain";

export type Sample = Float32Array;
export type Wave = "sine" | "triangle" | "saw" | "square";
export type FilterKind = "lowpass" | "highpass" | "bandpass";
export type NoiseColor = "white" | "pink" | "brown";

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

export function mul(a: Sample, b: Sample): Sample {
  const n = Math.min(a.length, b.length);
  const out = new Float32Array(Math.max(a.length, b.length));
  for (let i = 0; i < n; i++) out[i] = a[i]! * b[i]!;
  return out;
}

export function offset(src: Sample, seconds: number): Sample {
  const skip = Math.max(0, Math.floor(seconds * SAMPLE_RATE));
  const out = new Float32Array(src.length + skip);
  out.set(src, skip);
  return out;
}

function wave(kind: Wave, phase: number): number {
  const t = phase - Math.floor(phase);
  if (kind === "sine") return Math.sin(t * Math.PI * 2);
  if (kind === "square") return t < 0.5 ? 1 : -1;
  if (kind === "saw") return t * 2 - 1;
  return t < 0.5 ? t * 4 - 1 : 3 - t * 4;
}

/** Exponential decay envelope, peak at sample 0 after a linear attack. */
export function envelope(length: number, attack: number, peak: number): Sample {
  const out = new Float32Array(length);
  const a = Math.max(1, Math.floor(attack * SAMPLE_RATE));
  const tau = Math.max(1, length - a);
  for (let i = 0; i < length; i++) {
    if (i < a) out[i] = peak * (i / a);
    else out[i] = peak * Math.exp(-2.35 * ((i - a) / tau));
  }
  return out;
}

export function osc(
  kind: Wave,
  freq: number,
  seconds: number,
  amp: number,
  attack = 0.004,
  sweep = 1,
): Sample {
  const n = samples(seconds);
  const env = envelope(n, attack, amp);
  const out = new Float32Array(n);
  let phase = 0;
  const end = freq * sweep;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const f = freq + (end - freq) * t;
    out[i] = wave(kind, phase) * env[i]!;
    phase += f / SAMPLE_RATE;
  }
  return out;
}

export function impulse(seconds: number, amp: number): Sample {
  const out = alloc(seconds);
  if (out.length) out[0] = amp;
  const n = Math.min(out.length, Math.floor(0.004 * SAMPLE_RATE));
  for (let i = 1; i < n; i++) out[i] = amp * (1 - i / n) * (i % 2 ? -0.35 : 0.12);
  return out;
}

export function noise(seconds: number, seed: number, color: NoiseColor, amp: number): Sample {
  const n = samples(seconds);
  const out = new Float32Array(n);
  let state = seed >>> 0 || 1;
  let brown = 0;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < n; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const w = state / 4294967296 * 2 - 1;
    let v = w;
    if (color === "pink") {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.052691;
      v = b0 + b1 + b2 + w * 0.1848;
      v *= 0.18;
    } else if (color === "brown") {
      brown = (brown + w * 0.02) / 1.02;
      v = Math.max(-1, Math.min(1, brown * 3.6));
    }
    out[i] = v * amp;
  }
  return out;
}

/** Seeded looping brown noise for live beds. */
export function brownLoop(seconds: number, seed: number): Sample {
  return noise(seconds, seed, "brown", 1);
}

/** One-pole lowpass — tames hiss without a second oscillator. */
export function lowpass(src: Sample, cutoffHz: number): Sample {
  const out = new Float32Array(src.length);
  const rc = 1 / (2 * Math.PI * Math.max(1, cutoffHz));
  const a = (1 / SAMPLE_RATE) / (rc + 1 / SAMPLE_RATE);
  let y = 0;
  for (let i = 0; i < src.length; i++) {
    y += a * (src[i]! - y);
    out[i] = y;
  }
  return out;
}

export function biquad(src: Sample, kind: FilterKind, freq: number, q = 0.7): Sample {
  const out = new Float32Array(src.length);
  const w0 = (2 * Math.PI * freq) / SAMPLE_RATE;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.max(0.05, q));
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;
  if (kind === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else if (kind === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  }
  const ib0 = b0 / a0;
  const ib1 = b1 / a0;
  const ib2 = b2 / a0;
  const ia1 = a1 / a0;
  const ia2 = a2 / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < src.length; i++) {
    const x0 = src[i]!;
    const y0 = ib0 * x0 + ib1 * x1 + ib2 * x2 - ia1 * y1 - ia2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

/** One-pole lowpass with a moving cutoff. Wide on purpose — a parked narrow peak is a beep. */
export function sweepLowpass(src: Sample, startHz: number, endHz: number): Sample {
  const out = new Float32Array(src.length);
  const n = Math.max(1, src.length - 1);
  let y = 0;
  for (let i = 0; i < src.length; i++) {
    const hz = Math.max(40, startHz + (endHz - startHz) * (i / n));
    const a = 1 - Math.exp((-2 * Math.PI * hz) / SAMPLE_RATE);
    y += a * (src[i]! - y);
    out[i] = y;
  }
  return out;
}

export function saturate(src: Sample, drive = 1.6): Sample {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = Math.tanh(src[i]! * drive);
  return out;
}

export function fm(carrier: number, modHz: number, index: number, seconds: number, amp: number, seed: number): Sample {
  const n = samples(seconds);
  const env = envelope(n, 0.003, amp);
  const out = new Float32Array(n);
  let cPhase = unit(seed, 3);
  let mPhase = unit(seed, 4);
  for (let i = 0; i < n; i++) {
    const m = Math.sin(mPhase * Math.PI * 2);
    out[i] = Math.sin((cPhase + m * index) * Math.PI * 2) * env[i]!;
    cPhase += carrier / SAMPLE_RATE;
    mPhase += modHz / SAMPLE_RATE;
  }
  return out;
}

export function resonate(
  seconds: number,
  amp: number,
  freqs: readonly number[],
  decays: readonly number[],
  phases?: readonly number[],
): Sample {
  const n = samples(seconds);
  const out = new Float32Array(n);
  for (let p = 0; p < freqs.length; p++) {
    const f = freqs[p]!;
    const d = decays[p] ?? 0.12;
    const peak = amp / Math.pow(p + 1, 1.15);
    let phase = phases?.[p] ?? 0;
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE;
      const e = Math.exp(-t / Math.max(0.01, d));
      out[i]! += Math.sin(phase * Math.PI * 2) * peak * e;
      phase += f / SAMPLE_RATE;
    }
  }
  return out;
}

export function peakOf(src: Sample): number {
  let p = 0;
  for (let i = 0; i < src.length; i++) {
    const a = Math.abs(src[i]!);
    if (a > p) p = a;
  }
  return p;
}

export function rmsOf(src: Sample): number {
  if (!src.length) return 0;
  let s = 0;
  for (let i = 0; i < src.length; i++) s += src[i]! * src[i]!;
  return Math.sqrt(s / src.length);
}

export function same(a: Sample, b: Sample): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
