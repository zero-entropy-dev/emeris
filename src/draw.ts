import type { World } from "./sim";
import type { Style, View } from "./style";

export type { View };

/**
 * Single-screen world, centred in whatever viewport it is handed. World extent
 * is fixed at creation; the observer adapts. A larger window shows margin, a
 * smaller one crops evenly — neither disturbs the world.
 */
export function cameraCentred(world: World, view: View): { x: number; y: number } {
  return {
    x: (world.width - view.width) / 2,
    y: (world.height - view.height) / 2,
  };
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
  const cam = cameraCentred(world, view);
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
