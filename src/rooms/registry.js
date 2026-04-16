import { prop } from "./propLibrary";
import { DOOR_ANIM } from "../game/engine/constants";

const ROOM_W = 960;
const ROOM_H = 640;
const roomSize = { w: ROOM_W, h: ROOM_H };

// Wall geometry
const WALL_INSET     = 20;   // gap between canvas edge and wall outer face
const WALL_THICKNESS = 28;   // wall rect width/height

// Derived wall edges (inner walkable boundary)
const WALL_INNER_TOP    = WALL_INSET + WALL_THICKNESS;        // 48
const WALL_INNER_LEFT   = WALL_INSET + WALL_THICKNESS;        // 48
const WALL_INNER_RIGHT  = ROOM_W - WALL_INSET - WALL_THICKNESS; // 912
const WALL_INNER_BOTTOM = ROOM_H - WALL_INSET - WALL_THICKNESS; // 592

// Room centre
const ROOM_CX = ROOM_W / 2; // 480
const ROOM_CY = ROOM_H / 2; // 320

// Interactable radii
const RADIUS_DOOR    = 50;
const RADIUS_PANEL   = 50;
const RADIUS_PROJECT = 75;

// Door draw constants derived from DOOR_ANIM
const DOOR_DRAWN_H   = DOOR_ANIM.SOURCE_H * DOOR_ANIM.SCALE;  // 96
const DOOR_Y         = WALL_INNER_BOTTOM //- Math.round(DOOR_DRAWN_H * 0.5); // 522 — interaction point at sprite centre
const DOOR_Y_PROJECTS   = WALL_INNER_TOP + (DOOR_DRAWN_H / 2) ;

export const roomRegistry = {
  intro: {
    id: "intro",
    route: "/",
    title: "Intro",
    size: roomSize,
    spawns: {
      default:      { x: ROOM_CX, y: 460 },  // initial / nav-bar entry
      from_projects: { x: ROOM_CX, y: WALL_INNER_BOTTOM - 40 }, // arrived from projects door
    },
    base: {
      floorColor: "#102116",
      tile: { template: "floorTile", alpha: 0.16, step: 42 },
    },
    props: [
      prop("rug", "rug", { x: 470, y: 460 }),
      prop("plant-sw", "plant", { x: 140, y: 562 }),
      prop("plant-se", "plant", { x: 820, y: 562 }),
      prop("desk-about", "desk", { x: 480, y: 196 }),
    ],
    collisions: [
      { id: "wall-top",    shape: "rect", x: WALL_INSET, y: WALL_INSET, w: ROOM_W - WALL_INSET * 2, h: WALL_THICKNESS },
      { id: "wall-left",   shape: "rect", x: WALL_INSET, y: WALL_INSET, w: WALL_THICKNESS, h: ROOM_H - WALL_INSET * 2 },
      { id: "wall-right",  shape: "rect", x: WALL_INNER_RIGHT, y: WALL_INSET, w: WALL_THICKNESS, h: ROOM_H - WALL_INSET * 2 },
      { id: "wall-bottom", shape: "rect", x: WALL_INSET, y: WALL_INNER_BOTTOM, w: ROOM_W - WALL_INSET * 2, h: WALL_THICKNESS },
      { id: "desk-about-block",  shape: "rect", x: 375, y: 94,  w: 211, h: 102 },
      { id: "plant-block-sw",    shape: "rect", x: 104, y: 500, w: 72,  h: 80  },
      { id: "plant-block-se",    shape: "rect", x: 784, y: 500, w: 72,  h: 80  },
    ],
    interactables: [
      {
        id: "ia-about",
        type: "panel",
        x: ROOM_CX, y: 230,
        radius: RADIUS_PANEL,
        label: "About",
        contentId: "intro-card",
        openMode: "overlay",
      },
      {
        id: "ia-door-projects",
        type: "door",
        x: ROOM_CX, y: DOOR_Y,
        radius: RADIUS_DOOR,
        label: "\u2192 Projects",
        targetRoom: "projects",
        spawnId: "from_intro",
        openMode: "navigate",
        zAbove: true,
      },
      {
        id: "ia-github",
        type: "panel",
        x: 90, y: ROOM_CY + 20,
        radius: RADIUS_PANEL,
        label: "GitHub",
        contentId: "link-github",
        openMode: "overlay",
      },
      {
        id: "ia-linkedin",
        type: "panel",
        x: ROOM_W - 90, y: ROOM_CY + 20,
        radius: RADIUS_PANEL,
        label: "LinkedIn",
        contentId: "link-linkedin",
        openMode: "overlay",
      },
    ],
  },

  projects: {
    id: "projects",
    route: "/projects",
    title: "Projects",
    size: roomSize,
    spawns: {
      default:    { x: ROOM_CX, y: 340 }, // initial / nav-bar entry
      from_intro: { x: ROOM_CX, y: WALL_INNER_TOP + 40 }, // arrived from intro door
    },
    base: {
      floorColor: "#0d1e2a",
      tile: { template: "floorTile", alpha: 0.13, step: 48 },
    },
    props: [
      prop("rug-center", "rug",  { x: 480, y: 380 }),
      prop("desk-thesis", "desk", { x: 200, y: 190 }),
      prop("desk-bo",     "desk", { x: 690, y: 190 }),
      prop("desk-dsb",    "desk", { x: 200, y: 470 }),
      prop("desk-walk",   "desk", { x: 690, y: 470 }),
    ],
    collisions: [
      { id: "wall-top",    shape: "rect", x: WALL_INSET, y: WALL_INSET, w: ROOM_W - WALL_INSET * 2, h: WALL_THICKNESS },
      { id: "wall-left",   shape: "rect", x: WALL_INSET, y: WALL_INSET, w: WALL_THICKNESS, h: ROOM_H - WALL_INSET * 2 },
      { id: "wall-right",  shape: "rect", x: WALL_INNER_RIGHT, y: WALL_INSET, w: WALL_THICKNESS, h: ROOM_H - WALL_INSET * 2 },
      { id: "wall-bottom", shape: "rect", x: WALL_INSET, y: WALL_INNER_BOTTOM, w: ROOM_W - WALL_INSET * 2, h: WALL_THICKNESS },
      { id: "desk-thesis-block", shape: "rect", x: 95,  y: 88,  w: 211, h: 102 },
      { id: "desk-bo-block",     shape: "rect", x: 585, y: 88,  w: 211, h: 102 },
      { id: "desk-dsb-block",    shape: "rect", x: 95,  y: 368, w: 211, h: 102 },
      { id: "desk-walk-block",   shape: "rect", x: 585, y: 368, w: 211, h: 102 },
    ],
    interactables: [
      {
        id: "ia-thesis",
        type: "project",
        x: 200, y: 215,
        radius: RADIUS_PROJECT,
        label: "Master's Thesis",
        contentId: "project-masters-thesis",
        openMode: "overlay",
      },
      {
        id: "ia-bo",
        type: "project",
        x: 690, y: 215,
        radius: RADIUS_PROJECT,
        label: "B&O Audio",
        contentId: "project-bo-audio",
        openMode: "overlay",
      },
      {
        id: "ia-dsb",
        type: "project",
        x: 200, y: 495,
        radius: RADIUS_PROJECT,
        label: "DSB Railway",
        contentId: "project-dsb-signal",
        openMode: "overlay",
      },
      {
        id: "ia-walk",
        type: "project",
        x: 690, y: 495,
        radius: RADIUS_PROJECT,
        label: "Redirected Walking",
        contentId: "project-redirected-walking",
        openMode: "overlay",
      },
      {
        id: "ia-door-intro",
        type: "door",
        x: ROOM_CX, y: DOOR_Y_PROJECTS,
        radius: RADIUS_DOOR,
        label: "\u2190 Back to Intro",
        targetRoom: "intro",
        spawnId: "from_projects",
        openMode: "navigate",
        labelYOffset: + (DOOR_DRAWN_H + 20)
      },
    ],
  },
};

export const roomOrder = ["intro", "projects"];

export const roomByRoute = {
  "/": "intro",
  "/projects": "projects",
};
