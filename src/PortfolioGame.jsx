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
import WelcomeModal from "./ui/WelcomeModal";

const normalizeKey = (k) => (k.length === 1 ? k.toLowerCase() : k);
const MAX_RENDER_PIXELS = 1_800_000;
const ROOM_VIEW_ZOOM = 1.5;
const CHARACTER_VIEW_ZOOM = 1.2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const PLAYER_COLLISION_PADDING = 8;
const CLICK_PATH_GRID = 16;
const CLICK_PATH_MAX_ITERS = 6000;
const CLICK_WAYPOINT_EPS = 4;
const CLICK_STUCK_TIMEOUT = 1.5;
const CLICK_REPATH_COOLDOWN_MS = 140;
const PERF_DROP_MS = 22;
const DIAG_BUFFER_SIZE = 40;

const getAdaptiveDpr = (w, h) => {
  const base = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const total = w * h * base * base;
  if (total <= MAX_RENDER_PIXELS) return base;
  return Math.max(1, Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, w * h)));
};

export default function TudorPortfolioRoomRPG() {
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
  const clickPathRef = useRef([]);
  const clickGoalRef = useRef(null);
  const clickStuckTimerRef = useRef(0);
  const clickLastProgressPosRef = useRef(null);
  const clickNextRepathAtRef = useRef(0);
  const fpsHistoryRef = useRef({ frames: [], lastTime: 0, fps: 0, frameTime: 0 });
  const diagnosticsRef = useRef({
    enabled: true,
    events: [],
    frameDrops: 0,
    worstFrameMs: 0,
    pathBuilds: 0,
    pathBuildFails: 0,
    repaths: 0,
    repathFails: 0,
    blockedSteps: 0,
    stuckAborts: 0,
    lastPathMs: 0,
    lastPathIters: 0,
    lastPathLen: 0,
    lastEventTs: 0,
  });

  const [showWelcome, setShowWelcome] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0, dpr: 1 });
  const [roomId] = useState("intro");
  const [world, setWorld] = useState({ w: 672, h: 672 });
  const worldRef = useRef({ w: 672, h: 672 });
  const room = roomRegistry[roomId];

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

  const pushDiagEvent = (type, payload = {}, throttleMs = 180) => {
    const diag = diagnosticsRef.current;
    if (!diag.enabled) return;

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
    console.debug("[movement-diag]", event);
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
    clickPathRef.current = [];
    clickGoalRef.current = null;
    clickStuckTimerRef.current = 0;
    clickLastProgressPosRef.current = null;
    clickNextRepathAtRef.current = 0;
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
      const assets = await loadRoomAssets(roomRegistry.intro);
      if (!mounted) return;
      roomAssetsRef.current.intro = assets;

      setWorld({ w: room.size.w, h: room.size.h });
      const spawn = findRoomSpawn(room, assets, room.spawn);
      const p = playerRef.current;
      p.x = spawn.x;
      p.y = spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.facing = "down";
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

      if (showWelcomeRef.current) {
        if (k === "Enter" || k === "Space" || k === "e") dismissWelcome();
        return;
      }

      keysRef.current.add(k);

      // Manual keyboard input cancels click-to-move immediately.
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(k)) {
        clickPathRef.current = [];
        clickGoalRef.current = null;
        clickStuckTimerRef.current = 0;
        clickLastProgressPosRef.current = null;
        clickNextRepathAtRef.current = 0;
      }
    };

    const onUp = (e) => {
      let k = normalizeKey(e.key);
      if (e.code === "Space") k = "Space";
      keysRef.current.delete(k);
    };

    const onBlur = () => {
      keysRef.current.clear();
      clickPathRef.current = [];
      clickGoalRef.current = null;
      clickStuckTimerRef.current = 0;
      clickLastProgressPosRef.current = null;
      clickNextRepathAtRef.current = 0;
    };
    const onVisibility = () => {
      if (document.hidden) {
        keysRef.current.clear();
        clickPathRef.current = [];
        clickGoalRef.current = null;
        clickStuckTimerRef.current = 0;
        clickLastProgressPosRef.current = null;
        clickNextRepathAtRef.current = 0;
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

  const canMoveTo = (x, y) => !isBlockedByRoomCollisionWithPadding(x, y, room, PLAYER_COLLISION_PADDING);

  const buildClickPath = (startX, startY, targetX, targetY) => {
    const currentWorld = worldRef.current;
    const minX = 12;
    const maxX = currentWorld.w - 12;
    const minY = 12;
    const maxY = currentWorld.h - 12;

    const cols = Math.max(1, Math.floor((maxX - minX) / CLICK_PATH_GRID) + 1);
    const rows = Math.max(1, Math.floor((maxY - minY) / CLICK_PATH_GRID) + 1);

    const toCol = (x) => clamp(Math.round((x - minX) / CLICK_PATH_GRID), 0, cols - 1);
    const toRow = (y) => clamp(Math.round((y - minY) / CLICK_PATH_GRID), 0, rows - 1);
    const toX = (col) => clamp(minX + col * CLICK_PATH_GRID, minX, maxX);
    const toY = (row) => clamp(minY + row * CLICK_PATH_GRID, minY, maxY);
    const key = (col, row) => `${col},${row}`;
    const parse = (k) => {
      const [col, row] = k.split(",").map(Number);
      return { col, row };
    };
    const isWalkable = (col, row) => canMoveTo(toX(col), toY(row));
    const findNearestWalkableCell = (baseCol, baseRow, maxRadius = 6) => {
      if (isWalkable(baseCol, baseRow)) return { col: baseCol, row: baseRow };

      for (let radius = 1; radius <= maxRadius; radius += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          for (let dy = -radius; dy <= radius; dy += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const col = baseCol + dx;
            const row = baseRow + dy;
            if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
            if (isWalkable(col, row)) return { col, row };
          }
        }
      }

      return null;
    };

    const startCell = findNearestWalkableCell(toCol(startX), toRow(startY));
    const endCell = findNearestWalkableCell(toCol(targetX), toRow(targetY));
    if (!startCell || !endCell) return null;

    const startCol = startCell.col;
    const startRow = startCell.row;
    const endCol = endCell.col;
    const endRow = endCell.row;

    const startKey = key(startCol, startRow);
    const endKey = key(endCol, endRow);

    const open = [startKey];
    const openSet = new Set([startKey]);
    const cameFrom = new Map();
    const gScore = new Map([[startKey, 0]]);
    const startDx = Math.abs(endCol - startCol);
    const startDy = Math.abs(endRow - startRow);
    const startHeuristic = Math.max(startDx, startDy) + 0.414 * Math.min(startDx, startDy);
    const fScore = new Map([[startKey, startHeuristic]]);

    let iters = 0;
    while (open.length > 0 && iters < CLICK_PATH_MAX_ITERS) {
      iters += 1;

      let currentIndex = 0;
      let currentKey = open[0];
      let bestF = fScore.get(currentKey) ?? Number.POSITIVE_INFINITY;
      for (let i = 1; i < open.length; i += 1) {
        const candidateKey = open[i];
        const candidateF = fScore.get(candidateKey) ?? Number.POSITIVE_INFINITY;
        if (candidateF < bestF) {
          bestF = candidateF;
          currentKey = candidateKey;
          currentIndex = i;
        }
      }

      if (currentKey === endKey) {
        const cells = [];
        let walk = currentKey;
        while (walk) {
          cells.push(parse(walk));
          walk = cameFrom.get(walk);
        }
        cells.reverse();

        const rawPoints = cells.map((cell) => ({ x: toX(cell.col), y: toY(cell.row) }));

        // String-pull: reduce path to minimum waypoints reachable via clear straight lines.
        // Checks PLAYER_COLLISION_PADDING-spaced samples along each candidate segment.
        const segClear = (a, b) => {
          const sdx = b.x - a.x;
          const sdy = b.y - a.y;
          const sdist = Math.hypot(sdx, sdy);
          if (sdist < 0.5) return true;
          const steps = Math.max(2, Math.ceil(sdist / PLAYER_COLLISION_PADDING));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            if (!canMoveTo(a.x + sdx * t, a.y + sdy * t)) return false;
          }
          return true;
        };

        const points = [rawPoints[0]];
        let si = 0;
        while (si < rawPoints.length - 1) {
          let sj = rawPoints.length - 1;
          while (sj > si + 1 && !segClear(rawPoints[si], rawPoints[sj])) sj -= 1;
          points.push(rawPoints[sj]);
          si = sj;
        }

        return { points, iters };
      }

      open.splice(currentIndex, 1);
      openSet.delete(currentKey);

      const { col, row } = parse(currentKey);
      const neighbors = [
        { col: col + 1, row },
        { col: col - 1, row },
        { col, row: row + 1 },
        { col, row: row - 1 },
        { col: col + 1, row: row + 1 },
        { col: col + 1, row: row - 1 },
        { col: col - 1, row: row + 1 },
        { col: col - 1, row: row - 1 },
      ];

      for (const next of neighbors) {
        if (next.col < 0 || next.row < 0 || next.col >= cols || next.row >= rows) continue;
        if (!isWalkable(next.col, next.row)) continue;

        const isDiagonal = next.col !== col && next.row !== row;
        if (isDiagonal) {
          // Avoid corner cutting through blocked tiles.
          if (!isWalkable(next.col, row) || !isWalkable(col, next.row)) continue;
        }

        const nextKey = key(next.col, next.row);
        const moveCost = isDiagonal ? 1.414 : 1;
        const tentativeG = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + moveCost;
        const knownG = gScore.get(nextKey) ?? Number.POSITIVE_INFINITY;
        if (tentativeG >= knownG) continue;

        cameFrom.set(nextKey, currentKey);
        gScore.set(nextKey, tentativeG);
        const hx = Math.abs(endCol - next.col);
        const hy = Math.abs(endRow - next.row);
        const heuristic = Math.max(hx, hy) + 0.414 * Math.min(hx, hy);
        fScore.set(nextKey, tentativeG + heuristic);
        if (!openSet.has(nextKey)) {
          open.push(nextKey);
          openSet.add(nextKey);
        }
      }
    }

    return null;
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

  const handleCanvasPointerLeave = () => {
    // Intentionally keep click-to-move active when cursor exits the canvas.
    // Cancelling here causes "stops almost immediately" behavior after click.
  };

  const handleCanvasPointerDown = (e) => {
    if (showWelcomeRef.current) return;
    if (e.button !== 0) return;

    const point = toWorldPointFromPointer(e.clientX, e.clientY);
    if (!point) return;

    const currentWorld = worldRef.current;
    const targetX = clamp(point.x, 12, currentWorld.w - 12);
    const targetY = clamp(point.y, 12, currentWorld.h - 12);

    // Only accept click targets that are inside walkable space.
    if (!canMoveTo(targetX, targetY)) {
      clickPathRef.current = [];
      clickGoalRef.current = null;
      clickStuckTimerRef.current = 0;
      clickLastProgressPosRef.current = null;
      clickNextRepathAtRef.current = 0;
      return;
    }

    const p = playerRef.current;
    const pathStart = performance.now();
    const pathResult = buildClickPath(p.x, p.y, targetX, targetY);
    const pathMs = performance.now() - pathStart;
    const diag = diagnosticsRef.current;
    diag.pathBuilds += 1;
    diag.lastPathMs = pathMs;
    diag.lastPathIters = pathResult?.iters || 0;
    diag.lastPathLen = pathResult?.points?.length || 0;

    if (!pathResult || !pathResult.points || pathResult.points.length === 0) {
      diag.pathBuildFails += 1;
      pushDiagEvent("path_build_failed", { pathMs: Number(pathMs.toFixed(2)) });
      clickPathRef.current = [];
      clickGoalRef.current = null;
      clickStuckTimerRef.current = 0;
      clickLastProgressPosRef.current = null;
      clickNextRepathAtRef.current = 0;
      return;
    }

    clickPathRef.current = pathResult.points;
    clickGoalRef.current = { x: targetX, y: targetY };
    clickStuckTimerRef.current = 0;
    clickLastProgressPosRef.current = { x: p.x, y: p.y, goalDist: Math.hypot(targetX - p.x, targetY - p.y) };
    clickNextRepathAtRef.current = 0;
    // Path builds are frequent; log only expensive ones to reduce console overhead.
    if (pathMs >= 3 || pathResult.iters >= 260) {
      pushDiagEvent("path_built_slow", {
        pathLen: pathResult.points.length,
        pathIters: pathResult.iters,
        pathMs: Number(pathMs.toFixed(2)),
      });
    }
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

    tickEffects(effectsRef.current, dt);

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

    const path = clickPathRef.current;
    if (path.length > 0) {
      const p = playerRef.current;
      const beforeX = p.x;
      const beforeY = p.y;
      const speed = WALK_SPEED * SPRINT_MULTIPLIER;
      let moveBudget = speed * dt;
      let rePathAttempts = 0;

      // Track stuck time: if player makes no progress toward goal, auto-clear.
      const goal = clickGoalRef.current;
      if (goal) {
        const goalDist = Math.hypot(goal.x - p.x, goal.y - p.y);
        if (!clickLastProgressPosRef.current) {
          clickLastProgressPosRef.current = { x: p.x, y: p.y, goalDist };
        } else {
          const progress = Math.hypot(
            clickLastProgressPosRef.current.x - p.x,
            clickLastProgressPosRef.current.y - p.y
          );
          if (progress > 1) {
            // Made progress, reset stuck timer.
            clickStuckTimerRef.current = 0;
            clickLastProgressPosRef.current = { x: p.x, y: p.y, goalDist };
          } else {
            clickStuckTimerRef.current += dt;
            if (clickStuckTimerRef.current > CLICK_STUCK_TIMEOUT) {
              // Stuck for too long, abort pathfinding.
              diagnosticsRef.current.stuckAborts += 1;
              pushDiagEvent("stuck_abort", {
                pathLen: path.length,
                timer: Number(clickStuckTimerRef.current.toFixed(2)),
              });
              clickPathRef.current = [];
              clickGoalRef.current = null;
              clickStuckTimerRef.current = 0;
              clickLastProgressPosRef.current = null;
              clickNextRepathAtRef.current = 0;
              resetSprintEffects(effectsRef.current);
              return;
            }
          }
        }
      }

      while (path.length > 0 && moveBudget > 0) {
        const target = path[0];
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        // Use one full grid cell as arrival radius for every waypoint.
        // This matches the grid resolution and avoids blocked_step loops from sub-pixel mismatches.
        const waypointEps = CLICK_PATH_GRID;

        if (dist <= waypointEps) {
          path.shift();
          continue;
        }

        const dirX = dx / dist;
        const dirY = dy / dist;
        const step = Math.min(dist, moveBudget);
        const prevX = p.x;
        const prevY = p.y;
        let nx = p.x + dirX * step;
        let ny = p.y + dirY * step;

        if (!canMoveTo(nx, p.y)) nx = p.x;
        if (!canMoveTo(nx, ny)) ny = p.y;

        const currentWorld = worldRef.current;
        p.x = clamp(nx, 12, currentWorld.w - 12);
        p.y = clamp(ny, 12, currentWorld.h - 12);

        const movedStep = Math.hypot(p.x - prevX, p.y - prevY);
        const moved = movedStep > 0.001;

        if (moved) {
          moveBudget -= movedStep;
          if (Math.hypot(target.x - p.x, target.y - p.y) <= waypointEps) {
            path.shift();
          }
        } else {
          // If we got blocked on any waypoint, skip it — all points are grid-validated
          // so the next one is the best fallback.
          if (path.length > 1) {
            diagnosticsRef.current.blockedSteps += 1;
            path.shift();
            pushDiagEvent("skip_waypoint", { remaining: path.length }, 350);
            continue;
          }

          // Blocked on the final grid-cell waypoint: accept current position as arrived.
          path.shift();
          break;
        }
      }

      const totalDx = p.x - beforeX;
      const totalDy = p.y - beforeY;
      p.vx = totalDx / Math.max(dt, 0.0001);
      p.vy = totalDy / Math.max(dt, 0.0001);
      p.facing = facingFromVector(p.vx, p.vy, p.facing);
      p.animTime += Math.abs(p.vx) + Math.abs(p.vy) > 0 ? dt : dt * 0.35;

      const totalMoved = Math.hypot(totalDx, totalDy) > 0.001;
      if (totalMoved) {
        const dir = normalize(totalDx, totalDy);
        emitSprintEffects(effectsRef.current, dt, beforeX, beforeY, dir.x, dir.y);
      } else {
        resetSprintEffects(effectsRef.current);
      }

      if (path.length === 0) {
        clickGoalRef.current = null;
        clickStuckTimerRef.current = 0;
        clickLastProgressPosRef.current = null;
        clickNextRepathAtRef.current = 0;
      }

      return;
    }

    resetSprintEffects(effectsRef.current);
    const p = playerRef.current;
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

  const render = () => {
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
    const assets = roomAssetsRef.current.intro;

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
      ctx.fillRect(6, 6, 356, 176);
      ctx.strokeStyle = "rgba(167,243,208,0.45)";
      ctx.strokeRect(6, 6, 356, 176);
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
        `path ms=${debugHudData.diag.lastPathMs.toFixed(2)} iters=${debugHudData.diag.lastPathIters} len=${debugHudData.diag.lastPathLen}`,
        12,
        128
      );
      ctx.fillText(
        `buildFail=${debugHudData.diag.pathBuildFails} repath=${debugHudData.diag.repaths}/${debugHudData.diag.repathFails} blocked=${debugHudData.diag.blockedSteps} stuck=${debugHudData.diag.stuckAborts}`,
        12,
        144
      );
      ctx.fillText("F1 debug | F2 toggle logs | Click auto-sprints | Shift sprint keyboard", 12, 160);
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
      render();
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
      />

      <div className="room-chip">
        <strong>{room.title}</strong>
        <span>Keyboard + click movement</span>
      </div>

      {showWelcome ? <WelcomeModal onStart={dismissWelcome} /> : null}

      <div className="sr-only">
        <h1>Prototype room baseline</h1>
      </div>
    </section>
  );
}
