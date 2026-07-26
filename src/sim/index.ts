/** Sovereign simulation — no rendering, DOM, or platform imports. */

export type { Identity, IdentityDef } from "./identity";
export { identities, nearest } from "./identity";
export { random, type RngHost } from "./rng";
export type {
  Entity,
  EntityLocal,
  FlowerRegrow,
  Intent,
  Phase,
  World,
} from "./world";
export {
  FLOWER_REGROW_SECONDS,
  MEADOW_HEIGHT,
  MEADOW_WIDTH,
  addEntity,
  createWorld,
  deserialize,
  gardenComplete,
  localOf,
  removeEntity,
  serialize,
  step,
} from "./world";
