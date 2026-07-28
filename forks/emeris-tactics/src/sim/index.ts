/** Sovereign world package — no rendering, DOM, or platform imports. */

export type { Identity, IdentityDef } from "./identity";
export {
  tacticsIdentities,
  boardOf,
  isUnit,
  unitsOf,
  squadOrder,
  readyUnits,
  currentActor,
  unitAt,
  solidAt,
  manhattan,
  canMove,
  canAttack,
  applyCommitment,
  applyPlayerIntent,
} from "./identity";
export { identities } from "./registry";
export { random, type RngHost } from "./rng";
export type {
  Entity,
  EntityLocal,
  Intent,
  IntentAction,
  World,
} from "./world";
export {
  BOARD_COLS,
  BOARD_ROWS,
  SIDE_ENEMY,
  SIDE_PLAYER,
  addEntity,
  createWorld,
  deserialize,
  localOf,
  removeEntity,
  serialize,
} from "./world";
export { step } from "./step";
