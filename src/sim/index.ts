/** Sovereign world package — no rendering, DOM, or platform imports. */

export type { Identity, IdentityDef } from "./identity";
export {
  meadowIdentities,
  nearest,
  nearestFood,
  isFoodSource,
  dayOf,
  growthFactor,
  isNight,
  activityFactor,
  grassBiomass,
  populationPressure,
  DAY_SECONDS,
  store,
  decay,
  emit,
  transform,
} from "./identity";
export type { LocalNumber } from "./identity";
export { identities } from "./registry";
export { random, type RngHost } from "./rng";
export type { Entity, EntityLocal, Intent, World } from "./world";
export {
  MEADOW_HEIGHT,
  MEADOW_WIDTH,
  addEntity,
  createWorld,
  deserialize,
  localOf,
  removeEntity,
  serialize,
} from "./world";
export { step } from "./step";
