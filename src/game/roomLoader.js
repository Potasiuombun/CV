import { collectRoomImagePaths } from "./roomComposer";

export const loadImageWithData = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const w = img.width || 672;
      const h = img.height || 672;
      const probe = document.createElement("canvas");
      probe.width = w;
      probe.height = h;
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      let data = null;
      if (pctx) {
        pctx.clearRect(0, 0, w, h);
        pctx.drawImage(img, 0, 0, w, h);
        data = pctx.getImageData(0, 0, w, h).data;
      }
      resolve({ img, data, w, h });
    };
  });

export const loadRoomAssets = async (room) => {
  const imagePaths = collectRoomImagePaths(room);
  const loaded = await Promise.all(imagePaths.map((src) => loadImageWithData(src)));
  const images = {};

  for (let i = 0; i < imagePaths.length; i++) {
    images[imagePaths[i]] = loaded[i].img;
  }

  const baseSrc = room.base?.image || imagePaths[0];
  const base = loaded[imagePaths.indexOf(baseSrc)] || loaded[0];

  return {
    images,
    bgData: base?.data || null,
    fgData: null,
    w: room.size?.w || base?.w || 672,
    h: room.size?.h || base?.h || 672,
  };
};

export const findRoomSpawn = (room, assets, spawnId = "default") => {
  // Support both legacy single `spawn` and new `spawns` map
  const spawnsMap = room.spawns || (room.spawn ? { default: room.spawn } : {});
  const point = spawnsMap[spawnId] || spawnsMap["default"] || { x: assets.w / 2, y: assets.h / 2 };
  const sx = point.x <= 1 ? Math.round(assets.w * point.x) : Math.round(point.x);
  const sy = point.y <= 1 ? Math.round(assets.h * point.y) : Math.round(point.y);

  return {
    x: Math.max(12, Math.min(assets.w - 12, sx)),
    y: Math.max(12, Math.min(assets.h - 12, sy)),
  };
};
