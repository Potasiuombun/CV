import { propLibrary } from "../rooms/propLibrary";

const toPx = (value, size) => {
  if (typeof value !== "number") return 0;
  return value <= 1 ? value * size : value;
};

const getPropDef = (item) => {
  const template = item?.template ? propLibrary[item.template] : null;
  return template ? { ...template, ...item } : item;
};

const resolveRect = (item, roomSize, anchorX = 0.5, anchorY = 1) => {
  const w = toPx(item.w ?? 0.1, roomSize.w);
  const h = toPx(item.h ?? 0.1, roomSize.h);
  const x = toPx(item.x ?? 0, roomSize.w);
  const y = toPx(item.y ?? 0, roomSize.h);

  return {
    x: Math.round(x - w * anchorX),
    y: Math.round(y - h * anchorY),
    w: Math.round(w),
    h: Math.round(h),
  };
};

export const collectRoomImagePaths = (room) => {
  const set = new Set();
  const all = [...(room.props || [])];
  for (const item of all) {
    const def = getPropDef(item);
    if (def?.image) set.add(def.image);
  }
  const tileTemplate = room.base?.tile?.template ? propLibrary[room.base.tile.template] : null;
  if (tileTemplate?.image) set.add(tileTemplate.image);
  return [...set];
};

const drawProp = (ctx, item, images, room) => {
  const def = getPropDef(item);
  if (!def) return;
  const img = images?.[def.image];
  if (!img) return;

  const rect = resolveRect(def, room.size);
  const sx = def.sx ?? 0;
  const sy = def.sy ?? 0;
  const sw = def.sw ?? img.width;
  const sh = def.sh ?? img.height;

  ctx.save();
  ctx.globalAlpha = def.alpha ?? 1;
  ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
};

const drawFloorTiles = (ctx, room, images) => {
  const tile = room.base?.tile;
  if (!tile) return;
  const template = tile.template ? propLibrary[tile.template] : null;
  if (!template) return;
  const img = images?.[template.image];
  if (!img) return;

  const step = tile.step || 40;
  const alpha = tile.alpha ?? 0.12;
  const tileW = Math.max(20, Math.round(room.size.w * (template.w || 0.05)));
  const tileH = Math.max(20, Math.round(room.size.h * (template.h || 0.05)));

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let y = 0; y < room.size.h; y += step) {
    for (let x = 0; x < room.size.w; x += step) {
      ctx.drawImage(img, template.sx, template.sy, template.sw, template.sh, x, y, tileW, tileH);
    }
  }
  ctx.restore();
};

export const drawRoomBaseLayer = (ctx, room, images) => {
  ctx.fillStyle = room.base?.floorColor || "#132a1a";
  ctx.fillRect(0, 0, room.size.w, room.size.h);
  drawFloorTiles(ctx, room, images);
};

export const drawRoomPropsLayer = (ctx, room, images) => {
  const props = [...(room.props || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const item of props) {
    drawProp(ctx, item, images, room);
  }
};

export const isBlockedByRoomCollision = (x, y, room) => {
  for (const blocker of room?.collisions || []) {
    if (blocker.shape !== "rect") continue;
    const rect = {
      x: toPx(blocker.x, room.size.w),
      y: toPx(blocker.y, room.size.h),
      w: toPx(blocker.w, room.size.w),
      h: toPx(blocker.h, room.size.h),
    };
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return true;
    }
  }
  return false;
};

export const getCollisionRects = (room) => {
  const out = [];
  for (const blocker of room?.collisions || []) {
    if (blocker.shape !== "rect") continue;
    out.push({
      id: blocker.id,
      x: toPx(blocker.x, room.size.w),
      y: toPx(blocker.y, room.size.h),
      w: toPx(blocker.w, room.size.w),
      h: toPx(blocker.h, room.size.h),
    });
  }
  return out;
};

export const isBlockedByRoomCollisionWithPadding = (x, y, room, padding = 0) => {
  const rects = getCollisionRects(room);
  for (const rect of rects) {
    if (
      x >= rect.x - padding &&
      x <= rect.x + rect.w + padding &&
      y >= rect.y - padding &&
      y <= rect.y + rect.h + padding
    ) {
      return true;
    }
  }
  return false;
};

export const drawCollisionDebug = (ctx, room, padding = 0) => {
  const rects = getCollisionRects(room);
  for (const rect of rects) {
    ctx.strokeStyle = "rgba(255, 110, 110, 0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    if (padding > 0) {
      ctx.strokeStyle = "rgba(255, 180, 80, 0.65)";
      ctx.strokeRect(
        rect.x - padding,
        rect.y - padding,
        rect.w + padding * 2,
        rect.h + padding * 2
      );
    }
  }
};
