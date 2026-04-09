import { prop } from "./propLibrary";

const roomSize = { w: 960, h: 640 };

export const roomRegistry = {
  intro: {
    id: "intro",
    route: "/",
    title: "Prototype Room",
    size: roomSize,
    spawn: { x: 480, y: 560 },
    base: {
      floorColor: "#102116",
      tile: {
        template: "floorTile",
        alpha: 0.16,
        step: 42,
      },
    },
    props: [
      // Central rug/floor item.
      prop("rug", "rug", { x: 470, y: 440 }),
      // Plant near lower corner.
      prop("plant", "plant", { x: 150, y: 560 }),
    ],
    collisions: [
      // Room boundary walls.
      { id: "wall-top", shape: "rect", x: 20, y: 20, w: 920, h: 28 },
      { id: "wall-left", shape: "rect", x: 20, y: 20, w: 28, h: 600 },
      { id: "wall-right", shape: "rect", x: 912, y: 20, w: 28, h: 600 },
      { id: "wall-bottom", shape: "rect", x: 20, y: 592, w: 920, h: 28 },
      // Remaining furniture blocker.
      { id: "plant-block", shape: "rect", x: 115, y: 500, w: 75, h: 90 },
    ],
  },
};

export const roomOrder = ["intro"];

export const roomByRoute = {
  "/": "intro",
};
