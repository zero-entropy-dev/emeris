import type { World } from "./sim";
import type { Style, View } from "./style";

export type { View };

/** Camera top-left in world space, clamped so the view stays inside the meadow. */
export function cameraOrigin(world: World, view: View): { x: number; y: number } {
  const focus =
    world.entities.find((e) => e.id === world.controlledId) ??
    world.entities[0];
  const fx = focus?.x ?? world.width * 0.5;
  const fy = focus?.y ?? world.height * 0.5;
  const maxX = Math.max(0, world.width - view.width);
  const maxY = Math.max(0, world.height - view.height);
  return {
    x: Math.min(maxX, Math.max(0, fx - view.width * 0.5)),
    y: Math.min(maxY, Math.max(0, fy - view.height * 0.5)),
  };
}

/**
 * Immediate render: given current world + style + viewport, what appears?
 * Style.frame owns the picture; draw only sorts entities and looks up marks.
 * Camera is host/observer — sim stays in world coordinates.
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
