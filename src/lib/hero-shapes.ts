import { gsap } from 'gsap';

export type VariantId = 'A' | 'B' | 'C';

export interface Cursor {
  x: number;
  y: number;
  active: boolean;
  scrollOffset: number;
}

export type Cleanup = () => void;

export type VariantFn = (
  shapes: HTMLElement[],
  getCursor: () => Cursor,
  container: HTMLElement,
) => Cleanup;

const readScrollRate = (shape: HTMLElement): number => {
  const raw = shape.dataset.scrollRate;
  if (!raw) return 0;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

/* ─── Variant A — Drift
 * Phase-offset Lissajous orbit hand-computed on the ticker. A weighted
 * inverse-parallax offset from the shared cursor layers on top — shapes
 * near the pointer drift slightly away while still following their own
 * slow loop. Single writer per frame (gsap.set) so nothing fights over
 * the transform. */
export const variantDrift: VariantFn = (shapes, getCursor) => {
  const PARALLAX_MAX = 24;
  const PARALLAX_REACH = 320;
  const PARALLAX_LERP = 0.18;
  const params = shapes.map((_, i) => ({
    ampX: 22 + (i % 3) * 6,
    ampY: 26 + ((i + 1) % 3) * 6,
    freqX: (2 * Math.PI) / (7 + (i * 2.7) % 5),
    freqY: (2 * Math.PI) / ((7 + (i * 2.7) % 5) * 0.83),
    phaseX: (i * 1.7) % (Math.PI * 2),
    phaseY: (i * 1.1) % (Math.PI * 2),
  }));
  const parallax = shapes.map(() => ({ x: 0, y: 0 }));
  const scrollRates = shapes.map(readScrollRate);
  const start = performance.now();

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    const cursor = getCursor();

    shapes.forEach((shape, i) => {
      const p = params[i];
      const orbitX = Math.sin(t * p.freqX + p.phaseX) * p.ampX;
      const orbitY = Math.sin(t * p.freqY + p.phaseY) * p.ampY;
      const scrollY = -cursor.scrollOffset * scrollRates[i];

      if (!cursor.active) {
        parallax[i].x += (0 - parallax[i].x) * PARALLAX_LERP;
        parallax[i].y += (0 - parallax[i].y) * PARALLAX_LERP;
      } else {
        const rect = shape.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cursor.x - cx;
        const dy = cursor.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > PARALLAX_REACH) {
          parallax[i].x += (0 - parallax[i].x) * PARALLAX_LERP;
          parallax[i].y += (0 - parallax[i].y) * PARALLAX_LERP;
        } else {
          const weight = 1 - dist / PARALLAX_REACH;
          const targetX = -(dx / dist) * weight * PARALLAX_MAX;
          const targetY = -(dy / dist) * weight * PARALLAX_MAX;
          parallax[i].x += (targetX - parallax[i].x) * PARALLAX_LERP;
          parallax[i].y += (targetY - parallax[i].y) * PARALLAX_LERP;
        }
      }

      gsap.set(shape, {
        x: orbitX + parallax[i].x,
        y: orbitY + parallax[i].y + scrollY,
      });
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    gsap.set(shapes, { x: 0, y: 0 });
  };
};

/* ─── Variant B — Wander
 * Free-roaming random walk across the hero. Each shape has its own
 * velocity vector that accelerates/decelerates with small random nudges
 * and is capped to a soft max speed. Positions are toroidal — a shape
 * that exits the hero on one edge re-enters on the opposite. Cursor
 * proximity adds a gentle repulsion push (200px radius, 30px/s max).
 * Wordmark column and CTA band are no-fly zones: any shape inside gets
 * a radial push out, proportional to penetration depth, so shapes veer
 * around rather than drive through the protected regions. */
const WORDMARK_COL_START = 0.35;
const WORDMARK_COL_END = 0.65;
const CTA_BAND_START = 0.82;

const sampleRandomSafePosition = (width: number, height: number) => {
  for (let attempt = 0; attempt < 16; attempt++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const inWordmark = x > width * WORDMARK_COL_START && x < width * WORDMARK_COL_END;
    const inCta = y > height * CTA_BAND_START;
    if (!inWordmark && !inCta) return { x, y };
  }
  return { x: Math.random() * width * 0.3, y: Math.random() * height * 0.6 };
};

export const variantWander: VariantFn = (shapes, getCursor, container) => {
  // Target drift is rotation-based, not additive, so shapes keep their
  // speed while continuously changing heading. A mild speed floor makes
  // sure nothing stalls in dead air and a light damping keeps cursor
  // repulsion from blowing up over time.
  const TARGET_SPEED = 22;
  const SPEED_FLOOR = 16;
  const MAX_SPEED = 36;
  const TURN_RATE = 1.8;
  const CURSOR_REPEL_REACH = 220;
  const CURSOR_REPEL_FORCE = 60;
  const ZONE_PUSH_FORCE = 200;
  const DAMPING = 0.998;

  const rect0 = container.getBoundingClientRect();
  const anchors = shapes.map((shape) => {
    const r = shape.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - rect0.left,
      y: r.top + r.height / 2 - rect0.top,
    };
  });

  const positions = shapes.map(() => sampleRandomSafePosition(rect0.width, rect0.height));
  const velocities = shapes.map(() => {
    const angle = Math.random() * Math.PI * 2;
    return { x: Math.cos(angle) * TARGET_SPEED, y: Math.sin(angle) * TARGET_SPEED };
  });

  const scrollRates = shapes.map(readScrollRate);
  let lastTime = performance.now();

  const tick = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const cursor = getCursor();
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const wordmarkL = width * WORDMARK_COL_START;
    const wordmarkR = width * WORDMARK_COL_END;
    const wordmarkCx = (wordmarkL + wordmarkR) / 2;
    const ctaTop = height * CTA_BAND_START;

    shapes.forEach((shape, i) => {
      const pos = positions[i];
      const vel = velocities[i];

      // Rotate the velocity vector by a small random angle each frame —
      // preserves speed, changes heading. The result is a smooth wander
      // path rather than a jittery random walk.
      const turn = (Math.random() - 0.5) * TURN_RATE * dt;
      const cosA = Math.cos(turn);
      const sinA = Math.sin(turn);
      const rotatedX = vel.x * cosA - vel.y * sinA;
      const rotatedY = vel.x * sinA + vel.y * cosA;
      vel.x = rotatedX;
      vel.y = rotatedY;

      if (cursor.active) {
        const dx = pos.x - (cursor.x - rect.left);
        const dy = pos.y - (cursor.y - rect.top);
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < CURSOR_REPEL_REACH) {
          const weight = 1 - dist / CURSOR_REPEL_REACH;
          vel.x += (dx / dist) * weight * CURSOR_REPEL_FORCE * dt;
          vel.y += (dy / dist) * weight * CURSOR_REPEL_FORCE * dt;
        }
      }

      if (pos.x > wordmarkL && pos.x < wordmarkR) {
        const depth = 1 - Math.abs(pos.x - wordmarkCx) / ((wordmarkR - wordmarkL) / 2);
        const dir = pos.x < wordmarkCx ? -1 : 1;
        vel.x += dir * depth * ZONE_PUSH_FORCE * dt;
      }
      if (pos.y > ctaTop) {
        const depth = (pos.y - ctaTop) / (height - ctaTop + 1);
        vel.y -= (0.5 + depth) * ZONE_PUSH_FORCE * dt;
      }

      vel.x *= DAMPING;
      vel.y *= DAMPING;

      let speed = Math.hypot(vel.x, vel.y);
      if (speed > MAX_SPEED) {
        vel.x = (vel.x / speed) * MAX_SPEED;
        vel.y = (vel.y / speed) * MAX_SPEED;
        speed = MAX_SPEED;
      }
      // Keep each shape above a minimum speed so nothing drifts to a halt.
      if (speed < SPEED_FLOOR) {
        if (speed < 0.01) {
          const fallbackAngle = Math.random() * Math.PI * 2;
          vel.x = Math.cos(fallbackAngle) * SPEED_FLOOR;
          vel.y = Math.sin(fallbackAngle) * SPEED_FLOOR;
        } else {
          const scale = SPEED_FLOOR / speed;
          vel.x *= scale;
          vel.y *= scale;
        }
      }

      pos.x += vel.x * dt * 60;
      pos.y += vel.y * dt * 60;

      if (pos.x < -20) pos.x = width + 20;
      else if (pos.x > width + 20) pos.x = -20;
      if (pos.y < -20) pos.y = height + 20;
      else if (pos.y > height + 20) pos.y = -20;

      const scrollY = -cursor.scrollOffset * scrollRates[i];
      gsap.set(shape, {
        x: pos.x - anchors[i].x,
        y: pos.y - anchors[i].y + scrollY,
      });
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    gsap.set(shapes, { x: 0, y: 0 });
  };
};

/* ─── Variant C — Follow
 * All shapes lazily swim toward the cursor at staggered per-shape lerp
 * rates (0.02 "tail" to 0.08 "leader"), creating a trailing school of
 * fish that follows the pointer. When the cursor is idle (left the
 * hero, or hasn't moved for more than 500ms) the target becomes a
 * slowly-rotating orbit around the hero center (radius ~20% viewport
 * width, 20s period), so shapes keep moving gently instead of locking.
 * Wordmark column and CTA band are no-fly zones — same radial push
 * pattern as wander — so the school veers around protected regions. */
export const variantFollow: VariantFn = (shapes, getCursor, container) => {
  const ORBIT_PERIOD = 20;
  const ORBIT_FREQ = (2 * Math.PI) / ORBIT_PERIOD;
  const IDLE_TIMEOUT_MS = 500;
  const ZONE_PUSH = 0.35;

  const rect0 = container.getBoundingClientRect();
  const anchors = shapes.map((shape) => {
    const r = shape.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - rect0.left,
      y: r.top + r.height / 2 - rect0.top,
    };
  });
  const positions = anchors.map((a) => ({ x: a.x, y: a.y }));
  const followSpeeds = shapes.map((_, i) => 0.08 - (i / Math.max(shapes.length - 1, 1)) * 0.06);
  const scrollRates = shapes.map(readScrollRate);

  let lastCursorX = -Infinity;
  let lastCursorY = -Infinity;
  let lastMoveAt = -Infinity;
  const start = performance.now();

  const tick = () => {
    const now = performance.now();
    const cursor = getCursor();
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const wordmarkL = width * WORDMARK_COL_START;
    const wordmarkR = width * WORDMARK_COL_END;
    const wordmarkCx = (wordmarkL + wordmarkR) / 2;
    const ctaTop = height * CTA_BAND_START;

    if (cursor.active && (cursor.x !== lastCursorX || cursor.y !== lastCursorY)) {
      lastMoveAt = now;
      lastCursorX = cursor.x;
      lastCursorY = cursor.y;
    }
    const cursorIdle = !cursor.active || now - lastMoveAt > IDLE_TIMEOUT_MS;

    let targetX: number;
    let targetY: number;
    if (cursorIdle) {
      const t = (now - start) / 1000;
      const orbitRadius = window.innerWidth * 0.2;
      targetX = width / 2 + Math.cos(t * ORBIT_FREQ) * orbitRadius;
      targetY = height / 2 + Math.sin(t * ORBIT_FREQ) * orbitRadius;
    } else {
      targetX = cursor.x - rect.left;
      targetY = cursor.y - rect.top;
    }

    shapes.forEach((shape, i) => {
      const pos = positions[i];
      const speed = followSpeeds[i];
      pos.x += (targetX - pos.x) * speed;
      pos.y += (targetY - pos.y) * speed;

      if (pos.x > wordmarkL && pos.x < wordmarkR) {
        const depth = 1 - Math.abs(pos.x - wordmarkCx) / ((wordmarkR - wordmarkL) / 2);
        const dir = pos.x < wordmarkCx ? -1 : 1;
        pos.x += dir * depth * (wordmarkR - wordmarkL) * ZONE_PUSH * speed;
      }
      if (pos.y > ctaTop) {
        const depth = (pos.y - ctaTop) / (height - ctaTop + 1);
        pos.y -= (0.5 + depth) * (height - ctaTop) * ZONE_PUSH * speed;
      }

      const scrollY = -cursor.scrollOffset * scrollRates[i];
      gsap.set(shape, {
        x: pos.x - anchors[i].x,
        y: pos.y - anchors[i].y + scrollY,
      });
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    gsap.set(shapes, { x: 0, y: 0 });
  };
};

export const variants: Record<VariantId, VariantFn> = {
  A: variantDrift,
  B: variantWander,
  C: variantFollow,
};
