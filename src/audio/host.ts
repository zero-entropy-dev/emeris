/**
 * Host-owned observer. Owns AudioContext / one bed / one-shots.
 * Reads World + Style; never mutates World.
 */

import { type World } from "../sim";
import type { Style } from "../style";
import { capture, collect, type Watch } from "./hear";
import { SAMPLE_RATE, grainOf, type Sample } from "./kernel";
import { airBed, bedAmp, rustlePcm } from "./meadow";

const VOICE_CAP = 4;

type Voice = { stop: () => void };

function ctxCtor(): typeof AudioContext | undefined {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? w.webkitAudioContext;
}

export class Audio {
  private ctx: AudioContext | null = null;
  private dry: GainNode | null = null;
  private airGain: GainNode | null = null;
  private loop: AudioBufferSourceNode | null = null;
  private noise: AudioBuffer | null = null;
  private readonly voices: Voice[] = [];
  private readonly last = new Map<number, Watch>();
  private primed = false;
  private bedSeed = 0;

  unlock(): void {
    this.boot();
    void this.ctx?.resume();
  }

  suspend(): void {
    if (!this.ctx || this.ctx.state !== "running") return;
    void this.ctx.suspend();
  }

  resume(): void {
    if (!this.ctx || this.ctx.state === "closed") return;
    void this.ctx.resume();
  }

  reset(): void {
    this.primed = false;
    this.last.clear();
  }

  hear(world: World, style: Style, dt = 1 / 60): void {
    if (!this.ctx || this.ctx.state === "closed") return;
    this.ensureBed(world.seed);
    if (!this.primed) {
      capture(world, this.last);
      this.applyBed(world, style, true);
      this.primed = true;
      return;
    }
    void dt;
    for (const cue of collect(world, this.last)) {
      const grain = grainOf(world.seed, world.tick, cue.id, cue.name);
      this.play(rustlePcm(grain));
    }
    this.applyBed(world, style, false);
  }

  dispose(): void {
    for (const v of this.voices) v.stop();
    this.voices.length = 0;
    this.stopLoop();
    void this.ctx?.close();
    this.ctx = null;
    this.dry = null;
    this.airGain = null;
    this.noise = null;
    this.primed = false;
    this.last.clear();
  }

  private boot(): void {
    if (this.ctx) return;
    const Ctor = ctxCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(master);
    this.dry = dry;
    const air = ctx.createGain();
    air.gain.value = 0;
    air.connect(dry);
    this.airGain = air;
  }

  private ensureBed(seed: number): void {
    if (!this.ctx || !this.airGain) return;
    if (this.noise && this.bedSeed === seed) return;
    this.stopLoop();
    this.bedSeed = seed;
    this.noise = bufferOf(this.ctx, airBed(seed));
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.connect(this.airGain);
    src.start();
    this.loop = src;
  }

  private stopLoop(): void {
    if (!this.loop) return;
    try {
      this.loop.stop();
    } catch {
      /* already stopped */
    }
    this.loop.disconnect();
    this.loop = null;
  }

  private applyBed(world: World, style: Style, snap: boolean): void {
    if (!this.ctx || !this.airGain) return;
    const amp = 0.045 * bedAmp(world, style.name);
    const tau = snap ? 0.02 : 0.35;
    this.airGain.gain.setTargetAtTime(amp, this.ctx.currentTime, tau);
  }

  private play(pcm: Sample): void {
    if (!this.ctx || !this.dry || !pcm.length) return;
    const src = this.ctx.createBufferSource();
    src.buffer = bufferOf(this.ctx, pcm);
    src.connect(this.dry);
    src.start();
    let dead = false;
    const halt = (): void => {
      if (dead) return;
      dead = true;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
    };
    src.onended = halt;
    while (this.voices.length >= VOICE_CAP) this.voices.shift()?.stop();
    this.voices.push({ stop: halt });
  }
}

function bufferOf(ctx: AudioContext, pcm: Sample): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.max(1, pcm.length), SAMPLE_RATE);
  buf.getChannelData(0).set(pcm);
  return buf;
}
