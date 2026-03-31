import { roomOrder, roomRegistry } from "../rooms/registry";

export const interactableRegistry = roomOrder.reduce((acc, roomId) => {
  acc[roomId] = roomRegistry[roomId]?.interactables || [];
  return acc;
}, {});
