import {
  SMOKE_MAX_PARTICLES,
  SMOKE_MAX_RINGS,
  SMOKE_MAX_SPEED_LINES,
  SMOKE_PARTICLES_PER_SEC,
  SMOKE_RING_INTERVAL,
} from "./engine/constants";
import { clamp } from "./engine/math";

export const createSmokeState = () => ({
  trail: [],
  rings: [],
  lines: [],
  spawnCarry: 0,
  ringTimer: 0,
});

export const tickSmoke = (state, dt) => {
  for (let i = state.trail.length - 1; i >= 0; i--) {
    const p = state.trail[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.trail.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.size += p.grow * dt;
  }

  for (let i = state.rings.length - 1; i >= 0; i--) {
    const ring = state.rings[i];
    ring.life -= dt;
    if (ring.life <= 0) {
      state.rings.splice(i, 1);
      continue;
    }
    ring.radius += ring.expand * dt;
    ring.thickness = Math.max(0.7, ring.thickness - dt * 3.8);
    ring.x += ring.vx * dt;
    ring.y += ring.vy * dt;
    ring.vx *= 0.92;
    ring.vy *= 0.92;
  }

  for (let i = state.lines.length - 1; i >= 0; i--) {
    const line = state.lines[i];
    line.life -= dt;
    if (line.life <= 0) {
      state.lines.splice(i, 1);
      continue;
    }
    line.x += line.vx * dt;
    line.y += line.vy * dt;
    line.vx *= 0.9;
    line.vy *= 0.9;
  }
};

const emitSmokeTrail = (state, dt, originX, originY, dirX, dirY) => {
  state.spawnCarry += dt * SMOKE_PARTICLES_PER_SEC;

  while (state.spawnCarry >= 1 && state.trail.length < SMOKE_MAX_PARTICLES) {
    state.spawnCarry -= 1;

    const baseX = originX - dirX * 10;
    const baseY = originY - 6 - dirY * 10;
    const speed = 22 + Math.random() * 24;
    const life = 0.3 + Math.random() * 0.24;

    state.trail.push({
      x: baseX + (Math.random() - 0.5) * 5,
      y: baseY + (Math.random() - 0.5) * 5,
      vx: -dirX * speed + (Math.random() - 0.5) * 8,
      vy: -dirY * speed - 10 + (Math.random() - 0.5) * 10,
      size: 2.8 + Math.random() * 2.8,
      grow: 16 + Math.random() * 14,
      depth: 0.55 + Math.random() * 0.9,
      puffTilt: (Math.random() - 0.5) * 0.8,
      life,
      maxLife: life,
    });
  }
};

const emitSmokeBurstRing = (state, originX, originY, dirX, dirY) => {
  if (state.rings.length >= SMOKE_MAX_RINGS) {
    state.rings.splice(0, state.rings.length - SMOKE_MAX_RINGS + 1);
  }

  const sideX = -dirY;
  const sideY = dirX;
  const baseX = originX - dirX * 11;
  const baseY = originY - 5 - dirY * 11;

  state.rings.push({
    x: baseX + sideX * 4,
    y: baseY + sideY * 4,
    vx: -dirX * 10,
    vy: -dirY * 10 - 8,
    radius: 2.4,
    expand: 58 + Math.random() * 16,
    thickness: 3.4,
    life: 0.22,
    maxLife: 0.22,
  });

  state.rings.push({
    x: baseX - sideX * 4,
    y: baseY - sideY * 4,
    vx: -dirX * 10,
    vy: -dirY * 10 - 8,
    radius: 2.2,
    expand: 52 + Math.random() * 14,
    thickness: 3.1,
    life: 0.2,
    maxLife: 0.2,
  });
};

const emitSmokeSpeedLines = (state, originX, originY, dirX, dirY) => {
  const sideX = -dirY;
  const sideY = dirX;

  for (let i = 0; i < 3; i++) {
    if (state.lines.length >= SMOKE_MAX_SPEED_LINES) {
      state.lines.splice(0, state.lines.length - SMOKE_MAX_SPEED_LINES + 1);
    }

    const sideOffset = (Math.random() - 0.5) * 14;
    const backOffset = 10 + Math.random() * 8;
    const length = 9 + Math.random() * 8;
    const life = 0.055 + Math.random() * 0.04;

    state.lines.push({
      x: originX - dirX * backOffset + sideX * sideOffset,
      y: originY - 6 - dirY * backOffset + sideY * sideOffset,
      vx: -dirX * (54 + Math.random() * 36),
      vy: -dirY * (54 + Math.random() * 36) - 10,
      dirX,
      dirY,
      sideX,
      sideY,
      length,
      width: 1.2 + Math.random() * 1.2,
      life,
      maxLife: life,
    });
  }
};

export const emitSprintSmoke = (state, dt, originX, originY, dirX, dirY) => {
  emitSmokeTrail(state, dt, originX, originY, dirX, dirY);
  state.ringTimer += dt;

  while (state.ringTimer >= SMOKE_RING_INTERVAL) {
    state.ringTimer -= SMOKE_RING_INTERVAL;
    emitSmokeBurstRing(state, originX, originY, dirX, dirY);
    emitSmokeSpeedLines(state, originX, originY, dirX, dirY);
  }
};

export const resetSprintRingTimer = (state) => {
  state.ringTimer = 0;
};

export const drawSmoke = (ctx, state) => {
  for (let i = 0; i < state.lines.length; i++) {
    const line = state.lines[i];
    const fade = line.life / line.maxLife;
    const dx = -line.dirX * line.length;
    const dy = -line.dirY * line.length;
    const sideJitter = (1 - fade) * 2;
    const sx = line.x + line.sideX * sideJitter;
    const sy = line.y + line.sideY * sideJitter;

    ctx.strokeStyle = `rgba(255,255,255,${0.88 * fade})`;
    ctx.lineWidth = line.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx, sy + dy);
    ctx.stroke();

    ctx.strokeStyle = `rgba(214,232,255,${0.5 * fade})`;
    ctx.lineWidth = Math.max(0.7, line.width * 0.55);
    ctx.beginPath();
    ctx.moveTo(sx + line.sideX * 0.8, sy + line.sideY * 0.8);
    ctx.lineTo(sx + dx + line.sideX * 0.8, sy + dy + line.sideY * 0.8);
    ctx.stroke();
  }

  for (let i = 0; i < state.rings.length; i++) {
    const ring = state.rings[i];
    const fade = ring.life / ring.maxLife;
    ctx.strokeStyle = `rgba(255,255,255,${0.72 * fade})`;
    ctx.lineWidth = ring.thickness;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(230,238,255,${0.4 * fade})`;
    ctx.lineWidth = Math.max(0.7, ring.thickness * 0.5);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius + 1.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < state.trail.length; i++) {
    const p = state.trail[i];
    const fade = p.life / p.maxLife;
    const age = 1 - fade;
    const volume = p.depth;
    const depthN = clamp((volume - 0.55) / 0.9, 0, 1);
    const xStretch = 1.08 + volume * 0.26;
    const yStretch = 0.72 + volume * 0.2;
    const drift = Math.hypot(p.vx, p.vy) * 0.015;
    const rotation = Math.atan2(p.vy, p.vx) + p.puffTilt;
    const outerAlpha = (0.34 + volume * 0.2) * fade;
    const coreAlpha = (0.5 + volume * 0.22) * fade;
    const shadowAlpha = 0.24 * fade;
    const highlightAlpha = (0.3 + volume * 0.16) * (1 - age * 0.55);

    const coolFar = {
      r: Math.round(218 + depthN * 28),
      g: Math.round(228 + depthN * 24),
      b: Math.round(255 - depthN * 16),
    };
    const warmNear = {
      r: Math.round(238 + depthN * 17),
      g: Math.round(238 + depthN * 14),
      b: Math.round(252 - depthN * 18),
    };
    const shadowTone = {
      r: Math.round(150 + depthN * 30),
      g: Math.round(160 + depthN * 25),
      b: Math.round(188 - depthN * 20),
    };

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rotation);

    ctx.fillStyle = `rgba(${shadowTone.r},${shadowTone.g},${shadowTone.b},${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-p.size * 0.1, p.size * 0.28, p.size * xStretch, p.size * yStretch, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${coolFar.r},${coolFar.g},${coolFar.b},${outerAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * (1 + drift * 0.15), p.size * (0.92 + volume * 0.1), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(${warmNear.r},${warmNear.g},${warmNear.b},${coreAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-p.size * 0.12, -p.size * 0.08, p.size * 0.6, p.size * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${highlightAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-p.size * 0.25, -p.size * 0.3, p.size * 0.22, p.size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};
