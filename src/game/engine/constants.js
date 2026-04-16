export const SPRITE_SHEET_DATA_URL = "/Tudor_CV.png";

export const SPRITE = {
  frameW: 16,
  frameH: 32,
  drawW: 36,
  drawH: 72,
  anchorX: 18,
  anchorY: 66,
  fps: {
    idle: 5,
    run: 11,
    attack: 13,
    interact: 8,
  },
  states: {
    right: {
      idle: { row: 1, count: 6, start: 0 },
      run: { row: 2, count: 6, start: 0 },
      attack: { row: 13, count: 6, start: 0 },
      interact: { row: 14, count: 6, start: 0 },
    },
    up: {
      idle: { row: 1, count: 6, start: 6 },
      run: { row: 2, count: 6, start: 6 },
      attack: { row: 13, count: 6, start: 6 },
      interact: { row: 14, count: 6, start: 6 },
    },
    left: {
      idle: { row: 1, count: 6, start: 12 },
      run: { row: 2, count: 6, start: 12 },
      attack: { row: 13, count: 6, start: 12 },
      interact: { row: 14, count: 6, start: 12 },
    },
    down: {
      idle: { row: 1, count: 6, start: 18 },
      run: { row: 2, count: 6, start: 18 },
      attack: { row: 13, count: 6, start: 18 },
      interact: { row: 14, count: 6, start: 18 },
    },
  },
};

export const FG_SOLID_ALPHA = 200;
export const WALK_SPEED = 320;
export const SPRINT_MULTIPLIER = 3.8;
export const AUTOPILOT_MULTIPLIER = 3.4;
export const SMOKE_PARTICLES_PER_SEC = 56;
export const SMOKE_MAX_PARTICLES = 150;
export const SMOKE_RING_INTERVAL = 0.085;
export const SMOKE_MAX_RINGS = 36;
export const SMOKE_MAX_SPEED_LINES = 60;

// Door sprite (animated_door_condominium.png)
export const DOOR_ANIM = {
  SOURCE_W: 48,       // px width of each frame in the sprite sheet
  SOURCE_H: 32,       // px height of the sprite sheet (= frame height)
  SCALE: 3,           // integer pixel-art upscale factor
  FRAMES: 8,          // number of opening frames to use
  SPEED: 3.5,         // animation progress units per second (0→1)
  GLOW_BLUR: 12,
  GLOW_COLOR: "rgba(251,191,36,0.9)",
};
