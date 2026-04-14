import { prop } from "./propLibrary";

const roomSize = { w: 960, h: 640 };

export const roomRegistry = {
  intro: {
    id: "intro",
    route: "/",
    title: "Intro",
    size: roomSize,
    spawn: { x: 480, y: 460 },
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
      { id: "wall-top",    shape: "rect", x: 20,  y: 20,  w: 920, h: 28  },
      { id: "wall-left",   shape: "rect", x: 20,  y: 20,  w: 28,  h: 600 },
      { id: "wall-right",  shape: "rect", x: 912, y: 20,  w: 28,  h: 600 },
      { id: "wall-bottom", shape: "rect", x: 20,  y: 592, w: 920, h: 28  },
      { id: "desk-about-block",  shape: "rect", x: 375, y: 94,  w: 211, h: 102 },
      { id: "plant-block-sw",    shape: "rect", x: 104, y: 500, w: 72,  h: 80  },
      { id: "plant-block-se",    shape: "rect", x: 784, y: 500, w: 72,  h: 80  },
    ],
    interactables: [
      {
        id: "ia-about",
        type: "panel",
        x: 480, y: 230,
        radius: 80,
        label: "About",
        contentId: "intro-card",
        openMode: "overlay",
      },
      {
        id: "ia-door-projects",
        type: "door",
        x: 480, y: 570,
        radius: 50,
        label: "\u2192 Projects",
        targetRoom: "projects",
        openMode: "navigate",
      },
      {
        id: "ia-github",
        type: "panel",
        x: 90, y: 340,
        radius: 50,
        label: "GitHub",
        contentId: "link-github",
        openMode: "overlay",
      },
      {
        id: "ia-linkedin",
        type: "panel",
        x: 870, y: 340,
        radius: 50,
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
    spawn: { x: 480, y: 340 },
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
      { id: "wall-top",    shape: "rect", x: 20,  y: 20,  w: 920, h: 28  },
      { id: "wall-left",   shape: "rect", x: 20,  y: 20,  w: 28,  h: 600 },
      { id: "wall-right",  shape: "rect", x: 912, y: 20,  w: 28,  h: 600 },
      { id: "wall-bottom", shape: "rect", x: 20,  y: 592, w: 920, h: 28  },
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
        radius: 75,
        label: "Master's Thesis",
        contentId: "project-masters-thesis",
        openMode: "overlay",
      },
      {
        id: "ia-bo",
        type: "project",
        x: 690, y: 215,
        radius: 75,
        label: "B&O Audio",
        contentId: "project-bo-audio",
        openMode: "overlay",
      },
      {
        id: "ia-dsb",
        type: "project",
        x: 200, y: 495,
        radius: 75,
        label: "DSB Railway",
        contentId: "project-dsb-signal",
        openMode: "overlay",
      },
      {
        id: "ia-walk",
        type: "project",
        x: 690, y: 495,
        radius: 75,
        label: "Redirected Walking",
        contentId: "project-redirected-walking",
        openMode: "overlay",
      },
      {
        id: "ia-door-intro",
        type: "door",
        x: 480, y: 570,
        radius: 50,
        label: "\u2190 Back to Intro",
        targetRoom: "intro",
        openMode: "navigate",
      },
    ],
  },
};

export const roomOrder = ["intro", "projects"];

export const roomByRoute = {
  "/": "intro",
  "/projects": "projects",
};
