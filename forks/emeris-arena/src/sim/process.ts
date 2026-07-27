/** Described processes — how Identity acts when `process` is present. Not a sixth name. */

import { localOf, type Entity, type World } from "./world";

/** Step outcome: remain, advance one, or jump to an absolute step index. */
export type ProcessOutcome = "stay" | "next" | number;

export type ProcessStep = {
  name: string;
  run: (e: Entity, world: World, dt: number) => ProcessOutcome;
};

export type ProcessDef = {
  steps: ProcessStep[];
};

/** Ensure process vars bag exists (plain numbers only). */
export function varsOf(e: Entity): Record<string, number> {
  const L = localOf(e);
  if (!L.vars) L.vars = {};
  return L.vars;
}

/**
 * Advance one tick of a described process.
 * Program counter and vars live on Entity.local — readable in a JSON dump.
 */
export function advanceProcess(
  e: Entity,
  world: World,
  dt: number,
  process: ProcessDef,
): void {
  const steps = process.steps;
  if (steps.length === 0) return;

  const L = localOf(e);
  let pc = L.pc ?? 0;
  if (pc < 0 || pc >= steps.length) pc = 0;

  const step = steps[pc]!;
  const outcome = step.run(e, world, dt);

  if (outcome === "stay") {
    L.pc = pc;
    return;
  }
  if (outcome === "next") {
    L.pc = (pc + 1) % steps.length;
    return;
  }
  if (typeof outcome === "number" && Number.isFinite(outcome)) {
    const target = Math.floor(outcome);
    L.pc = ((target % steps.length) + steps.length) % steps.length;
    return;
  }
  L.pc = pc;
}
