/**
 * Deterministic PCM kernel — shared by the meadow and sibling games (they
 * re-export this file by relative path). Change sound primitives here.
 */
export {
  grainOf,
  hash32,
  hashStr,
  jitter,
  unit,
  vary,
  samples,
  SAMPLE_RATE,
  type Grain,
  type MaterialOptions,
} from "./grain";
export {
  alloc,
  biquad,
  brownLoop,
  envelope,
  fm,
  gain,
  impulse,
  lowpass,
  mix,
  mul,
  noise,
  offset,
  osc,
  peakOf,
  resonate,
  rmsOf,
  same,
  saturate,
  sweepLowpass,
  type FilterKind,
  type NoiseColor,
  type Sample,
  type Wave,
} from "./pcm";
