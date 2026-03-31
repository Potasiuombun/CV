import { findNearestWalkableSpawn } from "./collision";

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
  const [bg, fg] = await Promise.all([loadImageWithData(room.bg), loadImageWithData(room.fg)]);
  return {
    bgImg: bg.img,
    fgImg: fg.img,
    bgData: bg.data,
    fgData: fg.data,
    w: bg.w,
    h: bg.h,
  };
};

export const findRoomSpawn = (room, assets, preferredRatio = null) => {
  const ratio = preferredRatio || room.spawnRatio;
  return findNearestWalkableSpawn(
    Math.round(assets.w * ratio.x),
    Math.round(assets.h * ratio.y),
    assets.w,
    assets.h,
    assets.bgData || null,
    assets.fgData || null
  );
};
