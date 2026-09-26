/** Sovereign world package — no rendering, DOM, or platform imports. */

export type { Identity, IdentityDef } from "./identity";
export {
  BOLT_LIFE,
  DRONE_HEALTH,
  FIRE_COOLDOWN,
  SHOT_LIFE,
  HIT_MARK_TIME,
  HURT_TIME,
  PLAYER_HEALTH,
  STALKER_HEALTH,
  WAVE_BREATHER,
  arenaIdentities,
  blocked,
  decay,
  emit,
  isEnemy,
  levelOf,
  lineOfSight,
  solidAt,
  spawnEnemy,
  store,
  transform,
  waveDrones,
  waveOf,
  waveStalkers,
} from "./identity";
export type { LocalNumber } from "./identity";
export { identities } from "./registry";
export { random, type RngHost } from "./rng";
export type { Entity, EntityLocal, Intent, World } from "./world";
export {
  ARENA_COLS,
  ARENA_ROWS,
  FIRST_WAVE_DELAY,
  addEntity,
  createWorld,
  deserialize,
  localOf,
  removeEntity,
  serialize,
} from "./world";
export { step } from "./step";
