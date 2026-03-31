import { FG_SOLID_ALPHA } from "./constants";
import { clamp } from "./math";

export const isNearBlack = (r, g, b) => r < 12 && g < 12 && b < 12;

export const isSolidAtData = (x, y, w, h, bgData, fgData) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= w || iy >= h) return true;
  const i = (iy * w + ix) * 4;

  if (bgData && i + 3 < bgData.length) {
    const r = bgData[i + 0];
    const g = bgData[i + 1];
    const b = bgData[i + 2];
    if (isNearBlack(r, g, b)) return true;
  }

  if (fgData && i + 3 < fgData.length) {
    const a = fgData[i + 3];
    if (a >= FG_SOLID_ALPHA) return true;
  }

  return false;
};

export const canStandAtData = (x, y, w, h, bgData, fgData) => {
  const footY = y - 1;
  const r = 3;
  const samples = [
    [x, footY],
    [x - r, footY],
    [x + r, footY],
    [x, footY - r],
    [x, footY + r],
  ];
  for (const p of samples) {
    if (isSolidAtData(p[0], p[1], w, h, bgData, fgData)) return false;
  }
  return true;
};

export const findNearestWalkableSpawn = (cx, cy, w, h, bgData, fgData) => {
  if (canStandAtData(cx, cy, w, h, bgData, fgData)) {
    return { x: clamp(Math.round(cx), 12, w - 12), y: clamp(Math.round(cy), 12, h - 12) };
  }

  for (let radius = 2; radius <= 220; radius += 2) {
    for (let dx = -radius; dx <= radius; dx += 2) {
      const top = { x: cx + dx, y: cy - radius };
      const bottom = { x: cx + dx, y: cy + radius };
      if (canStandAtData(top.x, top.y, w, h, bgData, fgData)) {
        return { x: clamp(Math.round(top.x), 12, w - 12), y: clamp(Math.round(top.y), 12, h - 12) };
      }
      if (canStandAtData(bottom.x, bottom.y, w, h, bgData, fgData)) {
        return { x: clamp(Math.round(bottom.x), 12, w - 12), y: clamp(Math.round(bottom.y), 12, h - 12) };
      }
    }
    for (let dy = -radius; dy <= radius; dy += 2) {
      const left = { x: cx - radius, y: cy + dy };
      const right = { x: cx + radius, y: cy + dy };
      if (canStandAtData(left.x, left.y, w, h, bgData, fgData)) {
        return { x: clamp(Math.round(left.x), 12, w - 12), y: clamp(Math.round(left.y), 12, h - 12) };
      }
      if (canStandAtData(right.x, right.y, w, h, bgData, fgData)) {
        return { x: clamp(Math.round(right.x), 12, w - 12), y: clamp(Math.round(right.y), 12, h - 12) };
      }
    }
  }

  return { x: clamp(Math.round(cx), 12, w - 12), y: clamp(Math.round(cy), 12, h - 12) };
};
