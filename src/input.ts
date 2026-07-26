/** Host-side key state → steer axes for Intent. Does not touch the world. */

const held = new Set<string>();

const codeToAxis: Record<string, { x: number; y: number }> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export function bindInput(): void {
  window.addEventListener("keydown", (e) => {
    if (codeToAxis[e.code]) {
      e.preventDefault();
      held.add(e.code);
    }
  });
  window.addEventListener("keyup", (e) => {
    held.delete(e.code);
  });
  window.addEventListener("blur", () => held.clear());
}

export function readSteer(): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const code of held) {
    const a = codeToAxis[code];
    if (!a) continue;
    x += a.x;
    y += a.y;
  }
  const len = Math.hypot(x, y);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}
