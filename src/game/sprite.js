import { SPRITE } from "./engine/constants";

export const analyzeSpriteSheet = (img) => {
  const rows = Math.max(1, Math.floor(img.height / SPRITE.frameH));
  const cols = Math.max(1, Math.floor(img.width / SPRITE.frameW));
  const rowHasPixels = new Array(rows).fill(false);

  const probe = document.createElement("canvas");
  probe.width = SPRITE.frameW;
  probe.height = SPRITE.frameH;
  const pctx = probe.getContext("2d", { willReadFrequently: true });

  if (pctx) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        pctx.clearRect(0, 0, SPRITE.frameW, SPRITE.frameH);
        pctx.drawImage(
          img,
          c * SPRITE.frameW,
          r * SPRITE.frameH,
          SPRITE.frameW,
          SPRITE.frameH,
          0,
          0,
          SPRITE.frameW,
          SPRITE.frameH
        );
        const px = pctx.getImageData(0, 0, SPRITE.frameW, SPRITE.frameH).data;
        for (let i = 3; i < px.length; i += 4) {
          if (px[i] > 0) {
            rowHasPixels[r] = true;
            break;
          }
        }
        if (rowHasPixels[r]) break;
      }
    }
  }

  return { rows, cols, rowHasPixels };
};

export const getSpriteFrameInfo = (img, spriteMeta, player) => {
  const moving = Math.abs(player.vx) + Math.abs(player.vy) > 0.001;
  const phase = player.action || (moving ? "run" : "idle");
  const dir = player.facing || "down";
  const dirMap = SPRITE.states[dir] || SPRITE.states.down;
  const baseClip = dirMap[phase] || dirMap.idle;

  const rows = Math.max(1, spriteMeta.rows || Math.floor(img.height / SPRITE.frameH) || 1);
  const cols = Math.max(1, spriteMeta.cols || Math.floor(img.width / SPRITE.frameW) || 1);
  let row = ((baseClip.row % rows) + rows) % rows;

  if (spriteMeta.rowHasPixels && !spriteMeta.rowHasPixels[row]) {
    const firstRow = spriteMeta.rowHasPixels.findIndex(Boolean);
    if (firstRow >= 0) row = firstRow;
  }

  const start = Math.max(0, Math.min(baseClip.start || 0, cols - 1));
  const maxCount = Math.max(1, cols - start);
  const count = Math.max(1, Math.min(baseClip.count || maxCount, maxCount));
  const fps = SPRITE.fps[phase] || 8;
  const frame = Math.floor(player.animTime * fps) % count;

  return {
    moving,
    phase,
    dir,
    row,
    start,
    count,
    frame,
    sx: (start + frame) * SPRITE.frameW,
    sy: row * SPRITE.frameH,
  };
};
