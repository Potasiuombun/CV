const BG_SHEET = "/Generic_Home_1_Layer_1.png?v=16x16";
const FG_SHEET = "/Generic_Home_1_Layer_2_.png?v=16x16";

export const propLibrary = {
  floorTile: {
    image: BG_SHEET,
    sx: 312,
    sy: 432,
    sw: 32,
    sh: 32,
    w: 0.062,
    h: 0.062,
  },
  rug: {
    image: BG_SHEET,
    sx: 200,
    sy: 380,
    sw: 180,
    sh: 110,
    w: 0.32,
    h: 0.2,
  },
  bookshelf: {
    image: FG_SHEET,
    sx: 80,
    sy: 120,
    sw: 88,
    sh: 180,
    w: 0.16,
    h: 0.28,
  },
  desk: {
    image: FG_SHEET,
    sx: 246,
    sy: 196,
    sw: 136,
    sh: 98,
    w: 0.22,
    h: 0.16,
  },
  plant: {
    image: FG_SHEET,
    sx: 332,
    sy: 334,
    sw: 60,
    sh: 78,
    w: 0.1,
    h: 0.13,
  },
};

export const prop = (id, template, overrides = {}) => ({
  id,
  template,
  ...overrides,
});
