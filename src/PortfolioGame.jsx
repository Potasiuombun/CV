import React, { useEffect, useMemo, useRef, useState } from "react";
import { contentRegistry, projectRouteToContentId } from "./content/contentRegistry";
import { AUTOPILOT_MULTIPLIER, SPRITE, SPRITE_SHEET_DATA_URL, SPRINT_MULTIPLIER, WALK_SPEED } from "./game/engine/constants";
import { canStandAtData, isSolidAtData } from "./game/collision";
import { buildContentPath, buildProjectPath, buildRoomPath, parseLocationRoute } from "./game/engine/routes";
import { dist2, facingFromVector, normalize } from "./game/engine/math";
import { createEffectsState, drawEffects, emitSprintEffects, resetSprintEffects, tickEffects } from "./game/effects";
import { loadRoomAssets, findRoomSpawn } from "./game/roomLoader";
import { analyzeSpriteSheet, getSpriteFrameInfo } from "./game/sprite";
import { roomByRoute, roomOrder, roomRegistry } from "./rooms/registry";
import PortfolioNav from "./ui/chrome/PortfolioNav";
import SectionScroller from "./ui/chrome/SectionScroller";
import OverlayManager from "./ui/overlay/OverlayManager";
import WelcomeModal from "./ui/WelcomeModal";

const CONTENT = {
  name: "Tudor-Razvan Tatar",
  tagline: "AI Engineer | Backend Engineer | Data & ML Engineer",
  about:
    "MSc in Computer Engineering (AI, Vision, Sound). I build end-to-end systems: data + modeling, backend APIs, and reliable operations.",
};

const normalizeKey = (k) => (k.length === 1 ? k.toLowerCase() : k);
const isMobileViewport = () => window.matchMedia("(max-width: 900px)").matches;
const toTitleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const buildContentByRoom = () => {
  const byRoom = {};
  for (const roomId of roomOrder) {
    const room = roomRegistry[roomId];
    byRoom[roomId] = (room.interactables || [])
      .filter((it) => it.contentId)
      .map((it) => {
        const content = contentRegistry[it.contentId];
        return {
          id: it.id,
          label: it.label,
          title: content?.title || it.label,
          summary: content?.subtitle || content?.body?.[0] || "",
        };
      });
  }
  return byRoom;
};

const resolveRoomIdFromPath = (pathname) => roomByRoute[pathname] || "intro";

export default function TudorPortfolioRoomRPG() {
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(null);
  const roomAssetsRef = useRef({});
  const currentRoomRef = useRef("intro");
  const spriteRef = useRef(null);
  const spriteMetaRef = useRef({ rows: 1, cols: 1, rowHasPixels: [true] });
  const playerRef = useRef(null);
  const viewportRef = useRef({ w: 0, h: 0, dpr: 1 });
  const showWelcomeRef = useRef(true);
  const debugRef = useRef(false);
  const interactionModeRef = useRef("desktop");
  const autopilotRef = useRef(null);
  const effectsRef = useRef(createEffectsState());

  const [showWelcome, setShowWelcome] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0, dpr: 1 });
  const [currentRoomId, setCurrentRoomId] = useState("intro");
  const [world, setWorld] = useState({ w: 672, h: 672 });
  const [activeContentId, setActiveContentId] = useState(null);
  const [player, setPlayer] = useState({
    x: 336,
    y: 289,
    vx: 0,
    vy: 0,
    facing: "down",
    animTime: 0,
    action: null,
    actionTime: 0,
  });

  const roomList = useMemo(() => roomOrder.map((id) => roomRegistry[id]), []);
  const contentByRoom = useMemo(() => buildContentByRoom(), []);
  const currentInteractables = useMemo(() => roomRegistry[currentRoomId]?.interactables || [], [currentRoomId]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

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
    currentRoomRef.current = currentRoomId;
  }, [currentRoomId]);

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
    keys.delete("Space");
    keys.delete("e");
  };

  const startAction = (type, duration) => {
    setPlayer((p) => ({ ...p, vx: 0, vy: 0, action: type, actionTime: duration }));
  };

  const dismissWelcome = () => {
    clearMovementKeys();
    setShowWelcome(false);
  };

  const getRoomAsset = (roomId) => roomAssetsRef.current[roomId];

  const getWorldInteractable = (item, activeWorld = world) => ({
    ...item,
    xPx: Math.round(activeWorld.w * item.x),
    yPx: Math.round(activeWorld.h * item.y),
  });

  const updateRoutePath = (path) => {
    const target = buildRoomPath(path);
    if (window.location.pathname !== target || window.location.search) {
      window.history.pushState({}, "", target);
    }
  };

  const openContent = (roomId, contentId) => {
    setActiveContentId(contentId);
    const content = contentRegistry[contentId];
    const room = roomRegistry[roomId];
    if (roomId === "projects" && content?.routeProjectId) {
      window.history.pushState({}, "", buildProjectPath(content.routeProjectId));
      return;
    }
    window.history.pushState({}, "", buildContentPath(room.route, contentId));
  };

  const closeContent = () => {
    setActiveContentId(null);
    const current = roomRegistry[currentRoomRef.current];
    updateRoutePath(current.route);
  };

  const setAutopilotTo = (xPx, yPx, item = null, speedBoost = 1) => {
    autopilotRef.current = {
      xPx,
      yPx,
      targetItemId: item?.id || null,
      acceptRadius: item?.radius ? Math.max(8, item.radius * 0.9) : 10,
      speedBoost,
    };
  };

  const navigateRoom = (roomId, options = {}) => {
    const targetRoomId = roomRegistry[roomId] ? roomId : "intro";
    const fromRoomId = options.fromRoomId || currentRoomRef.current;
    const roomData = roomRegistry[targetRoomId];
    const assets = getRoomAsset(targetRoomId);
    const targetW = assets?.w || world.w;
    const targetH = assets?.h || world.h;

    const popOutKey = `from${toTitleCase(fromRoomId)}`;
    const popOutRatio = roomData.popOutPoints?.[popOutKey] || roomData.popOutPoints?.nav || roomData.spawnRatio;
    const spawn = assets ? findRoomSpawn(roomData, assets, popOutRatio) : { x: Math.round(targetW * popOutRatio.x), y: Math.round(targetH * popOutRatio.y) };

    setCurrentRoomId(targetRoomId);
    setActiveContentId(null);
    if (assets) setWorld({ w: targetW, h: targetH });

    setPlayer((p) => ({
      ...p,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      animTime: p.animTime + 0.22,
      action: "interact",
      actionTime: 0.12,
    }));

    const section = document.getElementById(roomData.sectionId);
    if (section && options.scroll !== false) {
      section.scrollIntoView({ behavior: "auto", block: "start" });
    }

    if (!options.skipRouteUpdate) updateRoutePath(roomData.route);
  };

  const executeInteractable = (item) => {
    if (!item) return;

    if ((item.type === "project" || item.type === "scroll") && item.contentId) {
      openContent(currentRoomRef.current, item.contentId);
      return;
    }

    if (item.type === "door" && item.targetRoute) {
      const targetRoom = resolveRoomIdFromPath(item.targetRoute);
      navigateRoom(targetRoom, { fromRoomId: currentRoomRef.current });
      return;
    }

    if (item.type === "door" && item.href) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
  };

  const maybeInteractClosest = () => {
    const p = playerRef.current;
    if (!p) return false;
    const inWorld = currentInteractables.map((it) => getWorldInteractable(it));
    let closest = null;
    let best = Number.POSITIVE_INFINITY;

    for (const item of inWorld) {
      const d = dist2({ x: p.x, y: p.y }, { x: item.xPx, y: item.yPx });
      if (d < best) {
        best = d;
        closest = item;
      }
    }

    if (!closest) return false;
    if (best <= closest.radius * closest.radius) {
      executeInteractable(closest);
      return true;
    }

    setAutopilotTo(closest.xPx, closest.yPx, closest, 1.35);
    return true;
  };

  const onSectionInspect = (roomId, itemId) => {
    navigateRoom(roomId, { scroll: true, fromRoomId: currentRoomRef.current });
    const item = (roomRegistry[roomId]?.interactables || []).find((it) => it.id === itemId);
    if (!item) return;

    const activeWorld = getRoomAsset(roomId) ? { w: getRoomAsset(roomId).w, h: getRoomAsset(roomId).h } : world;
    const worldItem = getWorldInteractable(item, activeWorld);
    setAutopilotTo(worldItem.xPx, worldItem.yPx, worldItem, 1.45);
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
    const loadRooms = async () => {
      for (const roomId of roomOrder) {
        const room = roomRegistry[roomId];
        const assets = await loadRoomAssets(room);
        if (!mounted) return;
        roomAssetsRef.current[roomId] = assets;
      }

      const route = parseLocationRoute(window.location.pathname, window.location.search);
      const roomId = resolveRoomIdFromPath(route.route);
      const assets = roomAssetsRef.current[roomId];
      const room = roomRegistry[roomId];

      setWorld({ w: assets?.w || 672, h: assets?.h || 672 });
      const spawn = assets ? findRoomSpawn(room, assets) : { x: 336, y: 289 };

      setCurrentRoomId(roomId);
      setPlayer((p) => ({ ...p, x: spawn.x, y: spawn.y }));

      let startupContent = route.contentId;
      if (!startupContent && route.projectId) {
        startupContent = projectRouteToContentId[route.projectId] || null;
      }
      if (startupContent && contentRegistry[startupContent]) {
        setActiveContentId(startupContent);
      }
    };

    loadRooms();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onLocationChange = () => {
      const route = parseLocationRoute(window.location.pathname, window.location.search);
      const roomId = resolveRoomIdFromPath(route.route);
      navigateRoom(roomId, {
        skipRouteUpdate: true,
        scroll: false,
        fromRoomId: currentRoomRef.current,
      });

      let contentId = route.contentId;
      if (!contentId && route.projectId) {
        contentId = projectRouteToContentId[route.projectId] || null;
      }

      if (contentId && contentRegistry[contentId]) {
        setActiveContentId(contentId);
      } else {
        setActiveContentId(null);
      }
    };

    const onPopState = () => onLocationChange();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onDown = (e) => {
      let k = normalizeKey(e.key);
      if (e.code === "Space") k = "Space";

      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "e", "Enter", "Space", "Escape", "Shift", "F1", "f1"].includes(k)
      ) {
        e.preventDefault();
      }

      if (k === "F1" || k === "f1") {
        setShowDebug((v) => !v);
        return;
      }

      if (showWelcomeRef.current) {
        if (k === "Enter" || k === "Space" || k === "e") dismissWelcome();
        return;
      }

      keysRef.current.add(k);

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(k)) {
        autopilotRef.current = null;
      }

      if (k === "Escape") {
        clearMovementKeys();
        autopilotRef.current = null;
        closeContent();
      }
    };

    const onUp = (e) => {
      let k = normalizeKey(e.key);
      if (e.code === "Space") k = "Space";
      keysRef.current.delete(k);
    };

    const onBlur = () => keysRef.current.clear();
    const onVisibility = () => {
      if (document.hidden) keysRef.current.clear();
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
    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      setViewport({ w: window.innerWidth, h: window.innerHeight, dpr });
      interactionModeRef.current = isMobileViewport() ? "mobile" : "desktop";

      const c = canvasRef.current;
      if (!c) return;
      c.width = Math.floor(c.clientWidth * dpr);
      c.height = Math.floor(c.clientHeight * dpr);
      const ctx = c.getContext("2d");
      if (ctx) ctx.imageSmoothingEnabled = false;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const canMoveTo = (x, y) => {
    const assets = getRoomAsset(currentRoomRef.current);
    return canStandAtData(x, y, world.w, world.h, assets?.bgData || null, assets?.fgData || null);
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
    const before = playerRef.current || player;

    setPlayer((p) => {
      let nx = p.x + vx * dt;
      let ny = p.y + vy * dt;

      if (!canMoveTo(nx, p.y)) nx = p.x;
      if (!canMoveTo(nx, ny)) ny = p.y;

      return {
        ...p,
        x: Math.max(12, Math.min(world.w - 12, nx)),
        y: Math.max(12, Math.min(world.h - 12, ny)),
        vx,
        vy,
        facing: facingFromVector(vx, vy, p.facing),
        animTime: p.animTime + (Math.abs(vx) + Math.abs(vy) > 0 ? dt : dt * 0.35),
      };
    });

    if (emitSprint) {
      const trialX = before.x + vx * dt;
      const trialY = before.y + vy * dt;
      const moveX = trialX - before.x;
      const moveY = trialY - before.y;
      const moved = Math.abs(moveX) + Math.abs(moveY) > 0.001;
      if (moved) {
        const dir = normalize(moveX, moveY);
        emitSprintEffects(effectsRef.current, dt, before.x, before.y, dir.x, dir.y);
      } else {
        resetSprintEffects(effectsRef.current);
      }
    }
  };

  const update = (dt) => {
    if (showWelcomeRef.current) return;

    tickEffects(effectsRef.current, dt);
    const current = playerRef.current || player;

    if (current.action) {
      setPlayer((p) => {
        const nextActionTime = Math.max(0, p.actionTime - dt);
        return {
          ...p,
          vx: 0,
          vy: 0,
          animTime: p.animTime + dt,
          actionTime: nextActionTime,
          action: nextActionTime > 0 ? p.action : null,
        };
      });
      return;
    }

    const k = keysRef.current;

    if (k.has("Space")) {
      k.delete("Space");
      startAction("attack", 0.42);
      return;
    }

    if (k.has("e")) {
      k.delete("e");
      startAction("interact", 0.32);
      maybeInteractClosest();
      return;
    }

    if (k.has("Enter")) {
      k.delete("Enter");
      maybeInteractClosest();
    }

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

    const auto = autopilotRef.current;
    if (auto) {
      const dx = auto.xPx - current.x;
      const dy = auto.yPx - current.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= auto.acceptRadius * auto.acceptRadius) {
        const targetItem = (currentInteractables || [])
          .map((it) => getWorldInteractable(it))
          .find((it) => it.id === auto.targetItemId);
        if (targetItem) executeInteractable(targetItem);
        autopilotRef.current = null;
        return;
      }

      const dir = normalize(dx, dy);
      updatePlayerStep(dt, dir.x, dir.y, WALK_SPEED * AUTOPILOT_MULTIPLIER * (auto.speedBoost || 1));
      return;
    }

    resetSprintEffects(effectsRef.current);
    setPlayer((p) => ({ ...p, vx: 0, vy: 0, animTime: p.animTime + dt * 0.35 }));
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
        ctx.drawImage(
          img,
          info.sx,
          info.sy,
          SPRITE.frameW,
          SPRITE.frameH,
          p.x - SPRITE.anchorX,
          p.y - SPRITE.anchorY,
          SPRITE.drawW,
          SPRITE.drawH
        );
        return;
      }
    }

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(p.x - 6, p.y - 16, 12, 14);
  };

  const drawInteractables = (ctx) => {
    const items = (roomRegistry[currentRoomRef.current]?.interactables || []).map((it) => getWorldInteractable(it));
    const t = performance.now();

    for (const item of items) {
      const pulse = 0.6 + 0.4 * Math.sin(t / 210 + item.xPx);
      const isDoor = item.type === "door";
      ctx.fillStyle = isDoor
        ? `rgba(70,142,210,${0.2 + 0.22 * pulse})`
        : `rgba(252,211,77,${0.14 + 0.22 * pulse})`;
      ctx.beginPath();
      ctx.arc(item.xPx, item.yPx, Math.max(8, Math.round(item.radius * 0.42)), 0, Math.PI * 2);
      ctx.fill();
    }
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

    const currentPlayer = playerRef.current || player;
    const assets = getRoomAsset(currentRoomRef.current);

    ctx.fillStyle = "#050815";
    ctx.fillRect(0, 0, cw, ch);

    const scale = Math.max(1, Math.floor(Math.min(cw / world.w, ch / world.h)));
    const ox = Math.floor((cw - world.w * scale) / 2);
    const oy = Math.floor((ch - world.h * scale) / 2);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    if (assets?.bgImg) {
      ctx.drawImage(assets.bgImg, 0, 0, world.w, world.h);
    } else {
      ctx.fillStyle = "#1b253a";
      ctx.fillRect(0, 0, world.w, world.h);
    }

    drawInteractables(ctx);

    if (assets?.fgImg) {
      ctx.drawImage(assets.fgImg, 0, 0, world.w, world.h);
    }

    drawEffects(ctx, effectsRef.current);
    drawPlayer(ctx, currentPlayer);

    if (debugRef.current) {
      const img = spriteRef.current;
      const frameInfo = img ? getSpriteFrameInfo(img, spriteMetaRef.current, currentPlayer) : null;

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(6, 6, 268, 102);
      ctx.strokeStyle = "rgba(167,243,208,0.45)";
      ctx.strokeRect(6, 6, 268, 102);
      ctx.fillStyle = "#a7f3d0";
      ctx.font = "9px monospace";
      ctx.fillText(`room=${currentRoomRef.current} mode=${interactionModeRef.current}`, 12, 20);
      ctx.fillText(`x=${Math.round(currentPlayer.x)} y=${Math.round(currentPlayer.y)} facing=${currentPlayer.facing}`, 12, 34);
      ctx.fillText(`activeContent=${activeContentId || "none"} autopilot=${autopilotRef.current ? "on" : "off"}`, 12, 48);
      if (frameInfo) {
        ctx.fillText(`phase=${frameInfo.phase} row=${frameInfo.row} frame=${frameInfo.frame} count=${frameInfo.count}`, 12, 62);
      }
      ctx.fillText("F1 debug | Shift sprint+smoke | E/Enter interact", 12, 78);
      ctx.fillText("Doors=external/routes | Objects=open overlays", 12, 92);
    }

    ctx.restore();
  };

  useEffect(() => {
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onCanvasPointerDown = (e) => {
    const c = canvasRef.current;
    if (!c) return;

    dismissWelcome();

    const rect = c.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const dpr = viewportRef.current.dpr || 1;
    const cw = Math.floor(rect.width * dpr);
    const ch = Math.floor(rect.height * dpr);
    const scale = Math.max(1, Math.floor(Math.min(cw / world.w, ch / world.h)));
    const ox = Math.floor((cw - world.w * scale) / 2);
    const oy = Math.floor((ch - world.h * scale) / 2);

    const wx = (clickX * dpr - ox) / scale;
    const wy = (clickY * dpr - oy) / scale;

    if (wx < 0 || wy < 0 || wx > world.w || wy > world.h) return;

    const assets = getRoomAsset(currentRoomRef.current);
    if (isSolidAtData(wx, wy, world.w, world.h, assets?.bgData || null, assets?.fgData || null)) return;

    const inWorld = currentInteractables.map((it) => getWorldInteractable(it));
    const targetInteractable = inWorld.find((item) => {
      const d = dist2({ x: wx, y: wy }, { x: item.xPx, y: item.yPx });
      return d <= item.radius * item.radius;
    });

    setAutopilotTo(wx, wy, targetInteractable || null, 1.6);
    if (targetInteractable) startAction("interact", 0.22);
  };

  const onNavigateByNav = (roomId) => {
    const fromRoomId = currentRoomRef.current;
    navigateRoom(roomId, { fromRoomId });

    const firstContentItem = (roomRegistry[roomId]?.interactables || []).find((it) => it.contentId);
    if (!firstContentItem) return;

    const activeWorld = getRoomAsset(roomId) ? { w: getRoomAsset(roomId).w, h: getRoomAsset(roomId).h } : world;
    const worldItem = getWorldInteractable(firstContentItem, activeWorld);
    setAutopilotTo(worldItem.xPx, worldItem.yPx, worldItem, 1.9);
  };

  const overlayContent = activeContentId ? contentRegistry[activeContentId] : null;

  return (
    <div className="portfolio-root">
      <PortfolioNav rooms={roomList} activeRoomId={currentRoomId} onNavigate={onNavigateByNav} />

      <section className="game-stage" aria-label="Interactive room canvas">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Tudor Portfolio Game"
          onPointerDown={onCanvasPointerDown}
        />

        <div className="room-chip">
          <strong>{roomRegistry[currentRoomId]?.title}</strong>
          <span>{interactionModeRef.current === "mobile" ? "Tap to move/interact" : "Click or keyboard to interact"}</span>
        </div>

        {showWelcome ? <WelcomeModal onStart={dismissWelcome} /> : null}
      </section>

      <SectionScroller rooms={roomList} contentByRoom={contentByRoom} onInspectFromList={onSectionInspect} />
      <OverlayManager content={overlayContent} onClose={closeContent} />

      <div className="sr-only">
        <h1>{CONTENT.name}</h1>
        <p>{CONTENT.tagline}</p>
        <p>{CONTENT.about}</p>
      </div>
    </div>
  );
}
