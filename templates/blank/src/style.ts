/**
 * Programmable look. Reinterpret the whole world without rewriting entities.
 *
 * Marks may read the world but must never mutate it, and must never draw from
 * the world RNG. Jitter derives from entity id + tick so render cannot break replay.
 */

import { type Entity, type Identity, type World } from "./sim";

/** Host viewport in CSS pixels — observer only, never written into World. */
export type View = { width: number; height: number };

export type Mark = (
  ctx: CanvasRenderingContext2D,
  e: Entity,
  world: World,
) => void;

export type Style = {
  name: string;
  frame: (
    ctx: CanvasRenderingContext2D,
    world: World,
    view: View,
    cam: { x: number; y: number },
    entities: () => void,
  ) => void;
  marks: Partial<Record<Identity, Mark>>;
  unknown: Mark;
};

/** Stable [0, 1) from id + tick — not the world RNG. */
function visualHash(id: number, tick: number, salt = 0): number {
  let t = Math.imul(id + 1, 0x9e3779b1) ^ Math.imul(tick + salt, 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function markUnknown(ctx: CanvasRenderingContext2D, e: Entity): void {
  ctx.fillStyle = "#ff00aa";
  ctx.beginPath();
  ctx.arc(e.x, e.y - 6, 6, 0, Math.PI * 2);
  ctx.fill();
}

function makeBlankStyle(name: string): Style {
  return {
    name,
    frame(ctx, world, view, cam, entities) {
      ctx.fillStyle = "#1a1f24";
      ctx.fillRect(0, 0, view.width, view.height);

      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      entities();
      ctx.restore();

      ctx.fillStyle = "rgba(220, 230, 240, 0.55)";
      ctx.font = "14px Georgia, 'Times New Roman', serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Observing — blank", 16, 16);
      ctx.fillStyle = "rgba(180, 190, 200, 0.45)";
      ctx.fillText(
        `tick ${world.tick} · entities ${world.entities.length}`,
        16,
        36,
      );
    },
    marks: {
      landmark(ctx, e, world) {
        const h = visualHash(e.id, world.tick);
        ctx.fillStyle = `hsl(${200 + h * 40}, 18%, ${28 + h * 12}%)`;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 18);
        ctx.lineTo(e.x + 10, e.y);
        ctx.lineTo(e.x, e.y + 6);
        ctx.lineTo(e.x - 10, e.y);
        ctx.closePath();
        ctx.fill();
      },
      creature(ctx, e, world) {
        const phase = e.local?.phase ?? 0;
        const pulse = 0.85 + 0.15 * Math.sin(phase * Math.PI * 2);
        ctx.fillStyle = `hsl(${140 + visualHash(e.id, world.tick) * 40}, 45%, 55%)`;
        ctx.beginPath();
        ctx.arc(e.x, e.y - 4, 7 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 4);
        ctx.lineTo(
          e.x + Math.cos(e.facing) * 12,
          e.y - 4 + Math.sin(e.facing) * 12,
        );
        ctx.stroke();
      },
    },
    unknown: markUnknown,
  };
}

export const styles: Style[] = [
  makeBlankStyle("blank"),
  makeBlankStyle("spare"),
];
