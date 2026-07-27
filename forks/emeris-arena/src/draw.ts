import type { World } from "./sim";
import type { Style, View } from "./style";

export type { View };

/**
 * Single-screen world: extent matches the view; camera stays at origin.
 * No scrolling — nothing lives outside the viewport.
 */
export function cameraOrigin(_world: World, _view: View): { x: number; y: number } {
  return { x: 0, y: 0 };
}

/**
 * Immediate render: given current world + style + viewport, what appears?
 * Style.frame owns the picture; draw only sorts entities and looks up marks.
 * Camera is host/observer — world stays in world coordinates.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  world: World,
  style: Style,
  view: View,
): void {
  const cam = cameraOrigin(world, view);
  style.frame(ctx, world, view, cam, () => {
    const sorted = [...world.entities].sort((a, b) => a.y - b.y);
    for (const e of sorted) {
      const mark = style.marks[e.identity] ?? style.unknown;
      ctx.save();
      mark(ctx, e, world);
      ctx.restore();
    }
  });
}
