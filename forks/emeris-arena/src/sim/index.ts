/** Sovereign world package — no rendering, DOM, or platform imports. */

export type { Identity, IdentityDef } from "./identity";
export {
  arenaIdentities,
  blocked,
  decay,
  emit,
  isEnemy,
  levelOf,
  solidAt,
  store,
  transform,
} from "./identity";
export type { LocalNumber } from "./identity";
export { identities } from "./registry";
export { random, type RngHost } from "./rng";
export type { ProcessDef, ProcessOutcome, ProcessStep } from "./process";
export { advanceProcess, varsOf } from "./process";
export type { Entity, EntityLocal, Intent, World } from "./world";
export {
  ARENA_COLS,
  ARENA_ROWS,
  addEntity,
  createWorld,
  deserialize,
  localOf,
  removeEntity,
  serialize,
} from "./world";
export { step } from "./step";
