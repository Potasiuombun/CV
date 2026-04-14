export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const dist2 = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const normalize = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
};

export const facingFromVector = (vx, vy, fallback = "down") => {
  if (Math.abs(vx) > Math.abs(vy)) {
    if (vx < 0) return "left";
    if (vx > 0) return "right";
  }
  if (Math.abs(vy) > 0) {
    if (vy < 0) return "up";
    if (vy > 0) return "down";
  }
  return fallback;
};
