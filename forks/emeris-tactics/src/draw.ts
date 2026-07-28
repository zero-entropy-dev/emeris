import type { World } from "./sim";
import type { Style, View } from "./style";

export type { View };

export function cameraOrigin(_world: World, _view: View): { x: number; y: number } {
  return { x: 0, y: 0 };
}

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
