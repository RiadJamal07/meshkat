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
  const MAX_SPEED = 24;
  const NUDGE_MAGNITUDE = 14;
  const CURSOR_REPEL_REACH = 200;
  const CURSOR_REPEL_FORCE = 30;
  const ZONE_PUSH_FORCE = 180;
  const DAMPING = 0.985;

  const rect0 = container.getBoundingClientRect();
  const anchors = shapes.map((shape) => {
    const r = shape.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - rect0.left,
      y: r.top + r.height / 2 - rect0.top,
    };
  });

  const positions = shapes.map(() => sampleRandomSafePosition(rect0.width, rect0.height));
  const velocities = shapes.map(() => ({
    x: (Math.random() - 0.5) * MAX_SPEED,
    y: (Math.random() - 0.5) * MAX_SPEED,
  }));

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

      vel.x += (Math.random() - 0.5) * NUDGE_MAGNITUDE * dt;
      vel.y += (Math.random() - 0.5) * NUDGE_MAGNITUDE * dt;

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

      const speed = Math.hypot(vel.x, vel.y);
      if (speed > MAX_SPEED) {
        vel.x = (vel.x / speed) * MAX_SPEED;
        vel.y = (vel.y / speed) * MAX_SPEED;
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

/* ─── Variant C — Constellation
 * Shapes do a slow y-axis breath (±6px, 4s period) with a gentler x-axis
 * sway layered on top (±4px, 5s period, independent phase-offset) so they
 * drift subtly sideways as they breathe, never fully at rest. When the
 * cursor enters the hero, a dedicated SVG overlay draws thin brick lines
 * to the 3 nearest shapes, distance-weighted opacity, fade out past 280px.
 * Breath + sway are hand-computed in the ticker so transforms have a
 * single writer. */
export const variantConstellation: VariantFn = (shapes, getCursor, container) => {
  const REACH = 280;
  const NEAREST_COUNT = 3;
  const BREATH_AMP = 6;
  const BREATH_FREQ = (2 * Math.PI) / 4;
  const SWAY_AMP = 4;
  const SWAY_FREQ = (2 * Math.PI) / 5;
  const phases = shapes.map((_, i) => (i * 0.9) % 4);
  const swayPhases = shapes.map((_, i) => (i * 1.7) % 5);
  const scrollRates = shapes.map(readScrollRate);
  const start = performance.now();

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('hero-shapes-lines');
  svg.setAttribute('aria-hidden', 'true');
  const lines: SVGLineElement[] = [];
  for (let i = 0; i < NEAREST_COUNT; i++) {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('stroke', 'var(--color-brick)');
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0');
    svg.appendChild(line);
    lines.push(line);
  }
  container.appendChild(svg);

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    const cursor = getCursor();

    shapes.forEach((shape, i) => {
      const breath = Math.sin(t * BREATH_FREQ + phases[i]) * BREATH_AMP;
      const sway = Math.sin(t * SWAY_FREQ + swayPhases[i]) * SWAY_AMP;
      const scrollY = -cursor.scrollOffset * scrollRates[i];
      gsap.set(shape, { x: sway, y: breath + scrollY });
    });

    if (!cursor.active) {
      lines.forEach((line) => line.setAttribute('opacity', '0'));
      return;
    }
    const rect = container.getBoundingClientRect();
    const cxLocal = cursor.x - rect.left;
    const cyLocal = cursor.y - rect.top;
    const ranked = shapes
      .map((shape) => {
        const r = shape.getBoundingClientRect();
        const sx = r.left + r.width / 2 - rect.left;
        const sy = r.top + r.height / 2 - rect.top;
        const dist = Math.hypot(sx - cxLocal, sy - cyLocal);
        return { sx, sy, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, NEAREST_COUNT);
    ranked.forEach((node, i) => {
      const line = lines[i];
      if (node.dist > REACH) {
        line.setAttribute('opacity', '0');
        return;
      }
      const opacity = (1 - node.dist / REACH) * 0.75;
      line.setAttribute('x1', `${cxLocal}`);
      line.setAttribute('y1', `${cyLocal}`);
      line.setAttribute('x2', `${node.sx}`);
      line.setAttribute('y2', `${node.sy}`);
      line.setAttribute('opacity', `${opacity}`);
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    svg.remove();
    gsap.set(shapes, { x: 0, y: 0 });
  };
};

export const variants: Record<VariantId, VariantFn> = {
  A: variantDrift,
  B: variantWander,
  C: variantConstellation,
};
