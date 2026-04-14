import React, { useEffect, useRef, useState } from "react";
import { SPRITE, SPRITE_SHEET_DATA_URL, SPRINT_MULTIPLIER, WALK_SPEED } from "./game/engine/constants";
import { facingFromVector, normalize } from "./game/engine/math";
import { createEffectsState, drawEffects, emitSprintEffects, resetSprintEffects, tickEffects } from "./game/effects";
import { loadRoomAssets, findRoomSpawn } from "./game/roomLoader";
import {
  drawCollisionDebug,
  drawRoomBaseLayer,
  drawRoomPropsLayer,
  getCollisionRects,
  isBlockedByRoomCollisionWithPadding,
} from "./game/roomComposer";
import { analyzeSpriteSheet, getSpriteFrameInfo } from "./game/sprite";
import { roomRegistry } from "./rooms/registry";
import { contentRegistry } from "./content/contentRegistry";
import WelcomeModal from "./ui/WelcomeModal";
import OverlayManager from "./ui/overlays/OverlayManager";

const normalizeKey = (k) => (k.length === 1 ? k.toLowerCase() : k);
const MAX_RENDER_PIXELS = 1_800_000;
const ROOM_VIEW_ZOOM = 1.5;
const CHARACTER_VIEW_ZOOM = 1.2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PLAYER_COLLISION_PADDING = 8;
const CLICK_FINAL_EPS = 4;
const CLICK_SUBSTEP = 4;
const PERF_DROP_MS = 22;
const DIAG_BUFFER_SIZE = 40;

const getAdaptiveDpr = (w, h) => {
  const base = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const total = w * h * base * base;
  if (total <= MAX_RENDER_PIXELS) return base;
  return Math.max(1, Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, w * h)));
};

export default function TudorPortfolioRoomRPG({ roomId = "intro", onNavigate }) {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(null);
  const roomAssetsRef = useRef({});
  const spriteRef = useRef(null);
  const spriteMetaRef = useRef({ rows: 1, cols: 1, rowHasPixels: [true] });
  const playerRef = useRef({
    x: 336,
    y: 540,
    vx: 0,
    vy: 0,
    facing: "down",
    animTime: 0,
    action: null,
    actionTime: 0,
  });
  const viewportRef = useRef({ w: 0, h: 0, dpr: 1 });
  const showWelcomeRef = useRef(true);
  const debugRef = useRef(false);
  const effectsRef = useRef(createEffectsState());
  const clickRouteRef = useRef([]);
  const clickGoalRef = useRef(null);
  const clickMoveActiveRef = useRef(false);
  const roomBoundsRef = useRef({ minX: 12, minY: 12, maxX: 660, maxY: 660 });
  const fpsHistoryRef = useRef({ frames: [], lastTime: 0, fps: 0, frameTime: 0 });
  const diagnosticsRef = useRef({
    enabled: false,
    events: [],
    frameDrops: 0,
    worstFrameMs: 0,
    blockedMoves: 0,
    routeLen: 0,
    lastEventTs: 0,
  });
  const nearInteractableRef = useRef(null);
  const mouseHoverIaRef = useRef(null);
  const overlayOpenRef = useRef(false);
  const onNavigateRef = useRef(onNavigate);

  const [showWelcome, setShowWelcome] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0, dpr: 1 });
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [world, setWorld] = useState({ w: 672, h: 672 });
  const worldRef = useRef({ w: 672, h: 672 });
  const room = roomRegistry[roomId] ?? roomRegistry.intro;

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    showWelcomeRef.current = showWelcome;
  }, [showWelcome]);

  useEffect(() => {
    debugRef.current = showDebug;
  }, [showDebug]);

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  useEffect(() => {
    overlayOpenRef.current = activeOverlay !== null;
  }, [activeOverlay]);

  const pushDiagEvent = (type, payload = {}, throttleMs = 180) => {
    const diag = diagnosticsRef.current;

    const now = performance.now();
    if (now - diag.lastEventTs < throttleMs) return;
    diag.lastEventTs = now;

    const event = {
      t: Math.round(now),
      type,
      ...payload,
    };
    diag.events.push(event);
    if (diag.events.length > DIAG_BUFFER_SIZE) diag.events.shift();
    if (diag.enabled) console.debug("[movement-diag]", event);
  };

  const clearMovementKeys = () => {
    const keys = keysRef.current;
    keys.delete("ArrowUp");
    keys.delete("ArrowDown");
    keys.delete("ArrowLeft");
    keys.delete("ArrowRight");
    keys.delete("w");
    keys.delete("a");
    keys.delete("s");
    keys.delete("d");
  };

  const dismissWelcome = () => {
    clearMovementKeys();
    clickRouteRef.current = [];
    clickGoalRef.current = null;
    clickMoveActiveRef.current = false;
    setShowWelcome(false);
  };

  useEffect(() => {
    const img = new Image();
    img.src = SPRITE_SHEET_DATA_URL;
    img.onload = () => {
      spriteRef.current = img;
      spriteMetaRef.current = analyzeSpriteSheet(img);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRoom = async () => {
      const assets = await loadRoomAssets(room);
      if (!mounted) return;
      roomAssetsRef.current[room.id] = assets;

      setWorld({ w: room.size.w, h: room.size.h });
      const spawn = findRoomSpawn(room, assets, room.spawn);
      const p = playerRef.current;
      p.x = spawn.x;
      p.y = spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.facing = "down";

      // Clear movement and overlay when entering a new room
      clickRouteRef.current = [];
      clickGoalRef.current = null;
      clickMoveActiveRef.current = false;
      nearInteractableRef.current = null;
      setActiveOverlay(null);
    };

    loadRoom();
    return () => {
      mounted = false;
    };
  }, [room]);

  useEffect(() => {
    const onDown = (e) => {
      let k = normalizeKey(e.key);
      if (e.code === "Space") k = "Space";

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "Shift", "F1", "f1", "F2", "f2"].includes(k)) {
        e.preventDefault();
      }

      if (k === "F1" || k === "f1") {
        setShowDebug((v) => !v);
        return;
      }

      if (k === "F2" || k === "f2") {
        diagnosticsRef.current.enabled = !diagnosticsRef.current.enabled;
        console.info("[movement-diag] logging", diagnosticsRef.current.enabled ? "enabled" : "disabled");
        return;
      }

      // Overlay is open — only allow closing it
      if (overlayOpenRef.current) {
        if (k === "Escape" || k === "e") setActiveOverlay(null);
        return;
      }

      if (showWelcomeRef.current) {
        if (k === "Enter" || k === "Space" || k === "e") dismissWelcome();
        return;
      }

      // Trigger nearby interactable
      if (k === "e") {
        const near = nearInteractableRef.current;
        if (near) {
          if (near.openMode === "navigate") {
            onNavigateRef.current?.(near.targetRoom);
          } else {
            const content = contentRegistry[near.contentId];
            if (content) setActiveOverlay(content);
          }
        }
        return;
      }

      keysRef.current.add(k);

      // Manual keyboard input cancels click-to-move immediately.
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(k)) {
        clickRouteRef.current = [];
        clickGoalRef.current = null;
        clickMoveActiveRef.current = false;
      }
    };

    const onUp = (e) => {
      let k = normalizeKey(e.key);
      if (e.code === "Space") k = "Space";
      keysRef.current.delete(k);
    };

    const onBlur = () => {
      keysRef.current.clear();
      clickRouteRef.current = [];
      clickGoalRef.current = null;
      clickMoveActiveRef.current = false;
    };
    const onVisibility = () => {
      if (document.hidden) {
        keysRef.current.clear();
        clickRouteRef.current = [];
        clickGoalRef.current = null;
        clickMoveActiveRef.current = false;
      }
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    let resizeRaf = null;
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;

      const w = c.clientWidth || window.innerWidth;
      const h = c.clientHeight || window.innerHeight;
      const dpr = getAdaptiveDpr(w, h);

      setViewport((prev) => {
        if (prev.w === w && prev.h === h && Math.abs(prev.dpr - dpr) < 0.01) return prev;
        return { w, h, dpr };
      });

      c.width = Math.max(1, Math.floor(w * dpr));
      c.height = Math.max(1, Math.floor(h * dpr));
      const ctx = c.getContext("2d");
      if (ctx) ctx.imageSmoothingEnabled = false;
    };

    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    };

    resize();
    window.addEventListener("resize", onResize);
    return () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const getRoomWalkBounds = () => {
    const currentWorld = worldRef.current;
    return {
      minX: 12,
      minY: 12,
      maxX: currentWorld.w - 12,
      maxY: currentWorld.h - 12,
    };
  };

  const canMoveTo = (x, y) => {
    const b = roomBoundsRef.current;
    if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) return false;
    return !isBlockedByRoomCollisionWithPadding(x, y, room, PLAYER_COLLISION_PADDING);
  };

  const snapPointToWalkable = (x, y, maxRadius = 96, step = 4) => {
    const b = roomBoundsRef.current;
    const cx = clamp(x, b.minX, b.maxX);
    const cy = clamp(y, b.minY, b.maxY);
    if (canMoveTo(cx, cy)) return { x: cx, y: cy };

    for (let r = step; r <= maxRadius; r += step) {
      for (let dx = -r; dx <= r; dx += step) {
        const top = {
          x: clamp(cx + dx, b.minX, b.maxX),
          y: clamp(cy - r, b.minY, b.maxY),
        };
        const bottom = {
          x: clamp(cx + dx, b.minX, b.maxX),
          y: clamp(cy + r, b.minY, b.maxY),
        };
        if (canMoveTo(top.x, top.y)) return top;
        if (canMoveTo(bottom.x, bottom.y)) return bottom;
      }

      for (let dy = -r + step; dy <= r - step; dy += step) {
        const left = {
          x: clamp(cx - r, b.minX, b.maxX),
          y: clamp(cy + dy, b.minY, b.maxY),
        };
        const right = {
          x: clamp(cx + r, b.minX, b.maxX),
          y: clamp(cy + dy, b.minY, b.maxY),
        };
        if (canMoveTo(left.x, left.y)) return left;
        if (canMoveTo(right.x, right.y)) return right;
      }
    }

    return null;
  };

  const findReachablePointAlongLine = (fromX, fromY, toX, toY, moveBudget) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001) return { x: fromX, y: fromY, reachable: false };

    let x = fromX;
    let y = fromY;
    let traveled = 0;
    let canReachGoal = false;

    while (traveled < moveBudget && traveled < dist) {
      const remainingDx = toX - x;
      const remainingDy = toY - y;
      const remainingDist = Math.hypot(remainingDx, remainingDy);
      if (remainingDist <= 0.001) {
        canReachGoal = true;
        break;
      }

      const dirX = remainingDx / remainingDist;
      const dirY = remainingDy / remainingDist;
      const remainingBudget = moveBudget - traveled;
      const substep = Math.min(CLICK_SUBSTEP, remainingBudget, remainingDist);

      const nx = x + dirX * substep;
      const ny = y + dirY * substep;

      if (!canMoveTo(nx, ny)) {
        break;
      }

      x = nx;
      y = ny;
      traveled += substep;
    }

    return { x, y, reachable: canReachGoal };
  };

  const canTraverseSegment = (fromX, fromY, toX, toY) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.001) return canMoveTo(fromX, fromY);

    let x = fromX;
    let y = fromY;
    let traveled = 0;

    while (traveled < dist) {
      const remainingDx = toX - x;
      const remainingDy = toY - y;
      const remainingDist = Math.hypot(remainingDx, remainingDy);
      if (remainingDist <= 0.001) return true;

      const dirX = remainingDx / remainingDist;
      const dirY = remainingDy / remainingDist;
      const substep = Math.min(CLICK_SUBSTEP, remainingDist);

      const nx = x + dirX * substep;
      const ny = y + dirY * substep;

      if (!canMoveTo(nx, ny)) {
        return false;
      }

      x = nx;
      y = ny;
      traveled += substep;
    }

    return true;
  };

  const buildClickRoute = (startX, startY, goalX, goalY) => {
    // If direct route works, use it
    if (canTraverseSegment(startX, startY, goalX, goalY)) {
      return [{ x: goalX, y: goalY }];
    }

    // Generate candidate waypoint corners from blockers
    const bounds = roomBoundsRef.current;
    const rects = getCollisionRects(room);
    const candidates = [];

    for (const rect of rects) {
      const inflated = {
        x: rect.x - PLAYER_COLLISION_PADDING,
        y: rect.y - PLAYER_COLLISION_PADDING,
        w: rect.w + PLAYER_COLLISION_PADDING * 2,
        h: rect.h + PLAYER_COLLISION_PADDING * 2,
      };

      const cornerOffset = 4;
      const corners = [
        { x: inflated.x - cornerOffset, y: inflated.y - cornerOffset },
        { x: inflated.x + inflated.w + cornerOffset, y: inflated.y - cornerOffset },
        { x: inflated.x - cornerOffset, y: inflated.y + inflated.h + cornerOffset },
        { x: inflated.x + inflated.w + cornerOffset, y: inflated.y + inflated.h + cornerOffset },
      ];

      for (const corner of corners) {
        const cx = clamp(corner.x, bounds.minX, bounds.maxX);
        const cy = clamp(corner.y, bounds.minY, bounds.maxY);
        if (canMoveTo(cx, cy)) {
          if (!candidates.some((c) => Math.hypot(c.x - cx, c.y - cy) < 1)) {
            candidates.push({ x: cx, y: cy });
          }
        }
      }
    }

    // Try single-waypoint routes: start -> wp -> goal
    let bestRoute = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const wp of candidates) {
      if (canTraverseSegment(startX, startY, wp.x, wp.y) && canTraverseSegment(wp.x, wp.y, goalX, goalY)) {
        const dist = Math.hypot(wp.x - startX, wp.y - startY) + Math.hypot(goalX - wp.x, goalY - wp.y);
        if (dist < bestDist) {
          bestRoute = [wp, { x: goalX, y: goalY }];
          bestDist = dist;
        }
      }
    }

    if (bestRoute) return bestRoute;

    // Try two-waypoint routes: start -> wp1 -> wp2 -> goal
    for (let i = 0; i < candidates.length; i++) {
      for (let j = 0; j < candidates.length; j++) {
        const wp1 = candidates[i];
        const wp2 = candidates[j];
        if (
          canTraverseSegment(startX, startY, wp1.x, wp1.y) &&
          canTraverseSegment(wp1.x, wp1.y, wp2.x, wp2.y) &&
          canTraverseSegment(wp2.x, wp2.y, goalX, goalY)
        ) {
          const dist =
            Math.hypot(wp1.x - startX, wp1.y - startY) +
            Math.hypot(wp2.x - wp1.x, wp2.y - wp1.y) +
            Math.hypot(goalX - wp2.x, goalY - wp2.y);
          if (dist < bestDist) {
            bestRoute = [wp1, wp2, { x: goalX, y: goalY }];
            bestDist = dist;
          }
        }
      }
    }

    if (bestRoute) return bestRoute;

    // Fallback: move as far as possible along the direct line
    const stepResult = findReachablePointAlongLine(startX, startY, goalX, goalY, Number.POSITIVE_INFINITY);
    if (Math.hypot(stepResult.x - startX, stepResult.y - startY) > 1) {
      return [{ x: stepResult.x, y: stepResult.y }];
    }

    return [];
  };

  const toWorldPointFromPointer = (clientX, clientY) => {
    const c = canvasRef.current;
    if (!c) return null;

    const rect = c.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) return null;
    if (rect.width <= 0 || rect.height <= 0) return null;

    const dpr = viewportRef.current.dpr || 1;
    const currentWorld = worldRef.current;
    const currentPlayer = playerRef.current;
    const cw = Math.floor((c.clientWidth || rect.width) * dpr);
    const ch = Math.floor((c.clientHeight || rect.height) * dpr);
    if (!cw || !ch) return null;

    const baseScale = Math.min(cw / currentWorld.w, ch / currentWorld.h);
    const scale = Math.max(1, Math.floor(baseScale * ROOM_VIEW_ZOOM));
    const viewW = cw / scale;
    const viewH = ch / scale;
    const maxCamX = Math.max(0, currentWorld.w - viewW);
    const maxCamY = Math.max(0, currentWorld.h - viewH);

    const camX = clamp(currentPlayer.x - viewW * 0.5, 0, maxCamX);
    const camY = clamp(currentPlayer.y - viewH * 0.5, 0, maxCamY);

    const worldX = camX + (localX * dpr) / scale;
    const worldY = camY + (localY * dpr) / scale;
    return { x: worldX, y: worldY };
  };

  const handleCanvasPointerMove = (e) => {
    if (showWelcomeRef.current || overlayOpenRef.current) return;
    const point = toWorldPointFromPointer(e.clientX, e.clientY);
    if (!point) { mouseHoverIaRef.current = null; return; }
    let nearest = null;
    let nearestDist = Infinity;
    for (const ia of room.interactables || []) {
      const d = Math.hypot(ia.x - point.x, ia.y - point.y);
      if (d <= ia.radius && d < nearestDist) { nearestDist = d; nearest = ia; }
    }
    mouseHoverIaRef.current = nearest;
  };

  const handleCanvasPointerLeave = () => {
    mouseHoverIaRef.current = null;
  };

  const handleCanvasPointerDown = (e) => {
    if (showWelcomeRef.current) return;
    if (e.button !== 0) return;
    if (overlayOpenRef.current) return;

    // If clicking directly on a hovered interactable, trigger it immediately
    const hovered = mouseHoverIaRef.current;
    if (hovered) {
      if (hovered.openMode === "navigate") {
        onNavigateRef.current?.(hovered.targetRoom);
      } else {
        const content = contentRegistry[hovered.contentId];
        if (content) setActiveOverlay(content);
      }
      return;
    }

    const point = toWorldPointFromPointer(e.clientX, e.clientY);
    if (!point) return;

    const currentWorld = worldRef.current;
    const rawX = clamp(point.x, 12, currentWorld.w - 12);
    const rawY = clamp(point.y, 12, currentWorld.h - 12);

    const snappedGoal = snapPointToWalkable(rawX, rawY);
    if (!snappedGoal) {
      clickRouteRef.current = [];
      clickGoalRef.current = null;
      clickMoveActiveRef.current = false;
      return;
    }

    const p = playerRef.current;
    const route = buildClickRoute(p.x, p.y, snappedGoal.x, snappedGoal.y);
    clickRouteRef.current = route;
    clickGoalRef.current = snappedGoal;
    clickMoveActiveRef.current = route.length > 0;
  };

  const updatePlayerStep = (dt, inputX, inputY, speed, emitSprint = false) => {
    let ax = inputX;
    let ay = inputY;
    if (ax && ay) {
      ax *= 0.707;
      ay *= 0.707;
    }

    const vx = ax * speed;
    const vy = ay * speed;
    const p = playerRef.current;
    const beforeX = p.x;
    const beforeY = p.y;

    let nx = p.x + vx * dt;
    let ny = p.y + vy * dt;

    if (!canMoveTo(nx, p.y)) nx = p.x;
    if (!canMoveTo(nx, ny)) ny = p.y;

    const currentWorld = worldRef.current;
    p.x = Math.max(12, Math.min(currentWorld.w - 12, nx));
    p.y = Math.max(12, Math.min(currentWorld.h - 12, ny));
    p.vx = vx;
    p.vy = vy;
    p.facing = facingFromVector(vx, vy, p.facing);
    p.animTime += Math.abs(vx) + Math.abs(vy) > 0 ? dt : dt * 0.35;

    if (emitSprint) {
      const moveX = p.x - beforeX;
      const moveY = p.y - beforeY;
      const moved = Math.abs(moveX) + Math.abs(moveY) > 0.001;
      if (moved) {
        const dir = normalize(moveX, moveY);
        emitSprintEffects(effectsRef.current, dt, beforeX, beforeY, dir.x, dir.y);
      } else {
        resetSprintEffects(effectsRef.current);
      }
    }
  };

  const update = (dt) => {
    if (showWelcomeRef.current) return;
    if (overlayOpenRef.current) return; // Pause movement while overlay is open

    tickEffects(effectsRef.current, dt);

    // Track nearest interactable within range
    const p = playerRef.current;
    let nearest = null;
    let nearestDist = Infinity;
    for (const ia of room.interactables || []) {
      const d = Math.hypot(ia.x - p.x, ia.y - p.y);
      if (d <= ia.radius && d < nearestDist) {
        nearestDist = d;
        nearest = ia;
      }
    }
    nearInteractableRef.current = nearest;

    const k = keysRef.current;
    let ax = 0;
    let ay = 0;
    if (k.has("ArrowUp") || k.has("w")) ay -= 1;
    if (k.has("ArrowDown") || k.has("s")) ay += 1;
    if (k.has("ArrowLeft") || k.has("a")) ax -= 1;
    if (k.has("ArrowRight") || k.has("d")) ax += 1;

    if (ax || ay) {
      const sprinting = k.has("Shift");
      const speed = WALK_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
      updatePlayerStep(dt, ax, ay, speed, sprinting);
      if (!sprinting) resetSprintEffects(effectsRef.current);
      return;
    }

    const route = clickRouteRef.current;
    if (route.length > 0 && clickMoveActiveRef.current) {
      const p = playerRef.current;
      const frameBeforeX = p.x;
      const frameBeforeY = p.y;
      const speed = WALK_SPEED * SPRINT_MULTIPLIER;
      let moveBudget = speed * dt;

      while (route.length > 0 && moveBudget > 0.001) {
        const wp = route[0];
        const distToWp = Math.hypot(wp.x - p.x, wp.y - p.y);

        if (distToWp <= CLICK_FINAL_EPS) {
          route.shift(); // consume the reached waypoint
          continue;
        }

        const stepBeforeX = p.x;
        const stepBeforeY = p.y;
        const stepResult = findReachablePointAlongLine(p.x, p.y, wp.x, wp.y, moveBudget);
        const currentWorld = worldRef.current;
        p.x = clamp(stepResult.x, 12, currentWorld.w - 12);
        p.y = clamp(stepResult.y, 12, currentWorld.h - 12);

        const stepMoved = Math.hypot(p.x - stepBeforeX, p.y - stepBeforeY);
        moveBudget -= stepMoved;

        if (stepMoved < 0.1) {
          // No progress — stuck; clear and stop
          diagnosticsRef.current.blockedMoves += 1;
          pushDiagEvent("blocked_move", {}, 350);
          route.length = 0;
          clickGoalRef.current = null;
          clickMoveActiveRef.current = false;
          break;
        }

        // Stop processing further waypoints this frame if this one isn't reached yet
        if (Math.hypot(wp.x - p.x, wp.y - p.y) > CLICK_FINAL_EPS) {
          break;
        }
      }

      // Route exhausted normally — movement complete
      if (route.length === 0) {
        clickGoalRef.current = null;
        clickMoveActiveRef.current = false;
      }

      diagnosticsRef.current.routeLen = route.length;

      const totalDx = p.x - frameBeforeX;
      const totalDy = p.y - frameBeforeY;
      p.vx = totalDx / Math.max(dt, 0.0001);
      p.vy = totalDy / Math.max(dt, 0.0001);
      p.facing = facingFromVector(p.vx, p.vy, p.facing);
      p.animTime += Math.abs(p.vx) + Math.abs(p.vy) > 0 ? dt : dt * 0.35;

      const totalMoved = Math.hypot(totalDx, totalDy) > 0.001;
      if (totalMoved) {
        const dir = normalize(totalDx, totalDy);
        emitSprintEffects(effectsRef.current, dt, frameBeforeX, frameBeforeY, dir.x, dir.y);
      } else {
        resetSprintEffects(effectsRef.current);
      }

      return;
    }

    resetSprintEffects(effectsRef.current);
    p.vx = 0;
    p.vy = 0;
    p.animTime += dt * 0.35;
  };

  const drawPlayer = (ctx, p) => {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 6, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = spriteRef.current;
    if (img && img.width > 0 && img.height > 0) {
      const info = getSpriteFrameInfo(img, spriteMetaRef.current, p);
      if (info.sx + SPRITE.frameW <= img.width && info.sy + SPRITE.frameH <= img.height) {
        const drawW = Math.round(SPRITE.drawW * CHARACTER_VIEW_ZOOM);
        const drawH = Math.round(SPRITE.drawH * CHARACTER_VIEW_ZOOM);
        const anchorX = Math.round(SPRITE.anchorX * CHARACTER_VIEW_ZOOM);
        const anchorY = Math.round(SPRITE.anchorY * CHARACTER_VIEW_ZOOM);
        ctx.drawImage(
          img,
          info.sx,
          info.sy,
          SPRITE.frameW,
          SPRITE.frameH,
          p.x - anchorX,
          p.y - anchorY,
          drawW,
          drawH
        );
        return;
      }
    }

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(p.x - 6, p.y - 16, 12, 14);
  };

  const render = (t = 0) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = viewportRef.current.dpr || 1;
    const cw = Math.floor(c.clientWidth * dpr);
    const ch = Math.floor(c.clientHeight * dpr);
    if (!cw || !ch) return;

    if (c.width !== cw || c.height !== ch) {
      c.width = cw;
      c.height = ch;
      ctx.imageSmoothingEnabled = false;
    }

    const currentPlayer = playerRef.current;
    const currentWorld = worldRef.current;
    const assets = roomAssetsRef.current[room.id];

    ctx.fillStyle = "#050815";
    ctx.fillRect(0, 0, cw, ch);

    const baseScale = Math.min(cw / currentWorld.w, ch / currentWorld.h);
    const scale = Math.max(1, Math.floor(baseScale * ROOM_VIEW_ZOOM));
    const viewW = cw / scale;
    const viewH = ch / scale;
    const maxCamX = Math.max(0, currentWorld.w - viewW);
    const maxCamY = Math.max(0, currentWorld.h - viewH);

    const camX = clamp(currentPlayer.x - viewW * 0.5, 0, maxCamX);
    const camY = clamp(currentPlayer.y - viewH * 0.5, 0, maxCamY);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    drawRoomBaseLayer(ctx, room, assets?.images || {});
    drawRoomPropsLayer(ctx, room, assets?.images || {});
    drawEffects(ctx, effectsRef.current);
    drawPlayer(ctx, currentPlayer);

    // --- Interactable indicators ---
    const nearIa = nearInteractableRef.current;
    const hoverIa = mouseHoverIaRef.current;
    for (const ia of room.interactables || []) {
      const isDoor = ia.type === "door";
      const isNear = ia === nearIa;           // player is physically close (shows [E])
      const isHighlighted = isNear || ia === hoverIa; // either proximity or mouse hover
      const baseColor = isDoor ? "251,191,36" : "56,189,248";
      const pulse = 0.55 + 0.45 * Math.sin(t * 0.0025);

      // Outer glow ring (always visible)
      ctx.save();
      ctx.strokeStyle = isHighlighted
        ? `rgba(${baseColor},${0.55 + 0.35 * pulse})`
        : `rgba(${baseColor},0.28)`;
      ctx.lineWidth = isHighlighted ? 2 : 1.5;
      ctx.beginPath();
      ctx.arc(ia.x, ia.y, isHighlighted ? 18 + 4 * pulse : 14, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = `rgba(${baseColor},${isHighlighted ? 0.55 : 0.22})`;
      ctx.beginPath();
      ctx.arc(ia.x, ia.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Label — show [E] prompt only when player is physically near
      ctx.save();
      ctx.font = isHighlighted ? "bold 11px monospace" : "10px monospace";
      const promptText = isNear ? `[E] ${ia.label}` : ia.label;
      const tw = ctx.measureText(promptText).width;
      const tx = ia.x - tw / 2;
      const ty = ia.y - (isHighlighted ? 30 : 26);
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(tx - 4, ty - 12, tw + 8, 16);
      ctx.fillStyle = isHighlighted
        ? (isDoor ? "#fbbf24" : "#38bdf8")
        : (isDoor ? "rgba(251,191,36,0.75)" : "rgba(167,243,208,0.75)");
      ctx.fillText(promptText, tx, ty);
      ctx.restore();
    }

    let debugHudData = null;
    if (debugRef.current) {
      const img = spriteRef.current;
      const frameInfo = img ? getSpriteFrameInfo(img, spriteMetaRef.current, currentPlayer) : null;
      const rects = getCollisionRects(room);
      const leftWall = rects.find((r) => r.id === "wall-left");
      const topWall = rects.find((r) => r.id === "wall-top");
      const originX = leftWall ? leftWall.x + leftWall.w + PLAYER_COLLISION_PADDING + 1 : 0;
      const originY = topWall ? topWall.y + topWall.h + PLAYER_COLLISION_PADDING + 1 : 0;
      const localX = Math.max(0, Math.round(currentPlayer.x - originX));
      const localY = Math.max(0, Math.round(currentPlayer.y - originY));
      drawCollisionDebug(ctx, room, PLAYER_COLLISION_PADDING);

      // Draw click route
      const route = clickRouteRef.current;
      if (route.length > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(currentPlayer.x, currentPlayer.y);
        for (const wp of route) {
          ctx.lineTo(wp.x, wp.y);
        }
        ctx.stroke();

        // Draw waypoint markers
        ctx.fillStyle = "rgba(56, 189, 248, 0.6)";
        for (const wp of route) {
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (clickGoalRef.current) {
        const g = clickGoalRef.current;
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
        ctx.beginPath();
        ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(g.x - 6, g.y);
        ctx.lineTo(g.x + 6, g.y);
        ctx.moveTo(g.x, g.y - 6);
        ctx.lineTo(g.x, g.y + 6);
        ctx.stroke();
        ctx.restore();
      }

      const fpsHistory = fpsHistoryRef.current;
      const speed = Math.hypot(currentPlayer.vx, currentPlayer.vy);
      const diag = diagnosticsRef.current;
      debugHudData = {
        localX,
        localY,
        facing: currentPlayer.facing,
        frameInfo,
        camX,
        camY,
        fps: fpsHistory.fps,
        frameTime: fpsHistory.frameTime,
        speed: Math.round(speed),
        diag,
      };
    }

    ctx.restore();

    if (debugHudData) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(6, 6, 356, 160);
      ctx.strokeStyle = "rgba(167,243,208,0.45)";
      ctx.strokeRect(6, 6, 356, 160);
      ctx.fillStyle = "#a7f3d0";
      ctx.font = "9px monospace";
      ctx.fillText(`room=${room.id}`, 12, 20);
      ctx.fillText(`x=${debugHudData.localX} y=${debugHudData.localY} facing=${debugHudData.facing}`, 12, 34);
      if (debugHudData.frameInfo) {
        const f = debugHudData.frameInfo;
        ctx.fillText(`phase=${f.phase} row=${f.row} frame=${f.frame} count=${f.count}`, 12, 48);
      }
      ctx.fillText(`camX=${Math.round(debugHudData.camX)} camY=${Math.round(debugHudData.camY)}`, 12, 64);
      ctx.fillText(`speed=${debugHudData.speed} px/s`, 12, 80);
      ctx.fillText(`fps=${debugHudData.fps} frame=${debugHudData.frameTime.toFixed(2)}ms`, 12, 96);
      ctx.fillText(
        `drops=${debugHudData.diag.frameDrops} worst=${debugHudData.diag.worstFrameMs.toFixed(1)}ms`,
        12,
        112
      );
      ctx.fillText(
        `blockedMoves=${debugHudData.diag.blockedDirectMoves}`,
          `route=${debugHudData.diag.routeLen} blocked=${debugHudData.diag.blockedMoves}`,
        12,
        128
      );
      ctx.fillText("F1 debug | F2 toggle logs | Click auto-sprints | Shift sprint keyboard", 12, 144);
    }
  };

  useEffect(() => {
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      const frameTime = t - last;
      last = t;

      const fpsHistory = fpsHistoryRef.current;
      fpsHistory.frames.push(frameTime);
      if (fpsHistory.frames.length > 60) fpsHistory.frames.shift();
      const avgFrameTime = fpsHistory.frames.reduce((a, b) => a + b, 0) / fpsHistory.frames.length;
      fpsHistory.frameTime = avgFrameTime;
      fpsHistory.fps = Math.round(1000 / Math.max(1, avgFrameTime));

      const diag = diagnosticsRef.current;
      // Ignore very long gaps from tab/background pauses when tracking drops.
      if (!document.hidden && frameTime > PERF_DROP_MS && frameTime < 250) {
        diag.frameDrops += 1;
        if (frameTime > diag.worstFrameMs) diag.worstFrameMs = frameTime;
        pushDiagEvent("frame_drop", { frameMs: Number(frameTime.toFixed(2)) }, 350);
      }

      update(dt);
      render(t);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [room]);

  return (
    <section className="game-stage" aria-label="Prototype room canvas">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Prototype Room Game"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerLeave={handleCanvasPointerLeave}
      />

      <div className="room-chip">
        <strong>{room.title}</strong>
        <span>WASD / click to move · E to interact</span>
      </div>

      {showWelcome ? <WelcomeModal onStart={dismissWelcome} /> : null}

      <OverlayManager content={activeOverlay} onClose={() => setActiveOverlay(null)} />

      <div className="sr-only">
        <h1>Tudor Razvan Tatar — Portfolio</h1>
      </div>
    </section>
  );
}
