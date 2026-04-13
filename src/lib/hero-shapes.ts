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

/* ─── Variant B — Scatter
 * A slow idle Lissajous wobble runs constantly so shapes are never fully
 * at rest. On top of that, when cursor enters a 260px radius each shape
 * glides AWAY on a quadratic falloff curve, max 48px displacement. The
 * wobble target + scatter target + scroll offset are all composed before
 * being handed to a single gsap.quickTo per axis — the quickTo smoothing
 * acts as damping on the combined signal. Elastic return on cleanup. */
export const variantScatter: VariantFn = (shapes, getCursor) => {
  const REACH = 260;
  const MAX_DISP = 48;
  const WOBBLE_AMP_X = 7;
  const WOBBLE_AMP_Y = 9;
  const WOBBLE_FREQ_X = (2 * Math.PI) / 12;
  const WOBBLE_FREQ_Y = (2 * Math.PI) / 14;

  const quickTos = shapes.map((shape) => ({
    x: gsap.quickTo(shape, 'x', { duration: 0.32, ease: 'power2.out' }),
    y: gsap.quickTo(shape, 'y', { duration: 0.32, ease: 'power2.out' }),
  }));
  const scrollRates = shapes.map(readScrollRate);
  const wobblePhases = shapes.map((_, i) => ({
    x: (i * 1.3) % (Math.PI * 2),
    y: (i * 2.1) % (Math.PI * 2),
  }));
  const start = performance.now();

  const tick = () => {
    const t = (performance.now() - start) / 1000;
    const cursor = getCursor();
    shapes.forEach((shape, i) => {
      const wobbleX = Math.sin(t * WOBBLE_FREQ_X + wobblePhases[i].x) * WOBBLE_AMP_X;
      const wobbleY = Math.sin(t * WOBBLE_FREQ_Y + wobblePhases[i].y) * WOBBLE_AMP_Y;
      const scrollY = -cursor.scrollOffset * scrollRates[i];
      const rect = shape.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (!cursor.active) {
        quickTos[i].x(wobbleX);
        quickTos[i].y(wobbleY + scrollY);
        return;
      }
      const dx = cx - cursor.x;
      const dy = cy - cursor.y;
      const dist = Math.hypot(dx, dy);
      if (dist > REACH || dist === 0) {
        quickTos[i].x(wobbleX);
        quickTos[i].y(wobbleY + scrollY);
        return;
      }
      const falloff = (1 - dist / REACH) ** 2;
      const offset = falloff * MAX_DISP;
      quickTos[i].x((dx / dist) * offset + wobbleX);
      quickTos[i].y((dy / dist) * offset + wobbleY + scrollY);
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    shapes.forEach((shape) => {
      gsap.to(shape, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
    });
  };
};

/* ─── Variant C — Constellation
 * Shapes do a slow y-axis breath (±4px, 6s period, phase-offset) and are
 * otherwise still. When cursor enters the hero, a dedicated SVG overlay
 * draws thin brick-60% lines to the 3 nearest shapes, distance-weighted
 * opacity, fade out past 280px. Breath is hand-computed in the ticker so
 * transforms have a single writer. */
export const variantConstellation: VariantFn = (shapes, getCursor, container) => {
  const REACH = 280;
  const NEAREST_COUNT = 3;
  const BREATH_AMP = 6;
  const BREATH_FREQ = (2 * Math.PI) / 4;
  const phases = shapes.map((_, i) => (i * 0.9) % 4);
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
      const scrollY = -cursor.scrollOffset * scrollRates[i];
      gsap.set(shape, { x: 0, y: breath + scrollY });
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
  B: variantScatter,
  C: variantConstellation,
};
