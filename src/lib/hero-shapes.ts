import { gsap } from 'gsap';

export type VariantId = 'A' | 'B' | 'C';

export interface Cursor {
  x: number;
  y: number;
  active: boolean;
}

export type Cleanup = () => void;

export type VariantFn = (
  shapes: HTMLElement[],
  getCursor: () => Cursor,
  container: HTMLElement,
) => Cleanup;

/* ─── Variant A — Drift
 * Phase-offset Lissajous orbit via infinite yoyo tweens (independent x/y).
 * An rAF ticker adds a weighted inverse-parallax offset from the shared
 * cursor on top of the orbit, so cursor-near shapes drift slightly away
 * from the pointer while still following their own slow loop. */
export const variantDrift: VariantFn = (shapes, getCursor) => {
  const PARALLAX_MAX = 14;
  const PARALLAX_REACH = 480;
  const orbits: gsap.core.Tween[] = [];
  const parallax = shapes.map(() => ({ x: 0, y: 0 }));

  shapes.forEach((shape, i) => {
    const ampX = 10 + (i % 3) * 3;
    const ampY = 12 + ((i + 1) % 3) * 3;
    const dur = 22 + (i * 2.7) % 8;
    const phase = (i * 1.7) % (Math.PI * 2);

    orbits.push(
      gsap.to(shape, {
        x: `+=${ampX}`,
        duration: dur,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: -phase,
      }),
      gsap.to(shape, {
        y: `+=${ampY}`,
        duration: dur * 0.83,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: -phase * 0.6,
      }),
    );
  });

  const tick = () => {
    const cursor = getCursor();
    if (!cursor.active) {
      parallax.forEach((p) => {
        p.x += (0 - p.x) * 0.06;
        p.y += (0 - p.y) * 0.06;
      });
    } else {
      shapes.forEach((shape, i) => {
        const rect = shape.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cursor.x - cx;
        const dy = cursor.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > PARALLAX_REACH) {
          parallax[i].x += (0 - parallax[i].x) * 0.08;
          parallax[i].y += (0 - parallax[i].y) * 0.08;
          return;
        }
        const weight = 1 - dist / PARALLAX_REACH;
        const targetX = -(dx / dist) * weight * PARALLAX_MAX;
        const targetY = -(dy / dist) * weight * PARALLAX_MAX;
        parallax[i].x += (targetX - parallax[i].x) * 0.08;
        parallax[i].y += (targetY - parallax[i].y) * 0.08;
      });
    }
    shapes.forEach((shape, i) => {
      shape.style.setProperty('--parallax-x', `${parallax[i].x}px`);
      shape.style.setProperty('--parallax-y', `${parallax[i].y}px`);
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    orbits.forEach((t) => t.kill());
    shapes.forEach((shape) => {
      shape.style.removeProperty('--parallax-x');
      shape.style.removeProperty('--parallax-y');
      gsap.set(shape, { x: 0, y: 0 });
    });
  };
};

/* ─── Variant B — Scatter
 * Shapes rest at anchors. When cursor enters a 220px radius, each shape
 * glides AWAY on a quadratic falloff curve, max 36px displacement. Returns
 * to anchor with soft elastic ease on leave. */
export const variantScatter: VariantFn = (shapes, getCursor) => {
  const REACH = 220;
  const MAX_DISP = 36;

  const quickTos = shapes.map((shape) => ({
    x: gsap.quickTo(shape, 'x', { duration: 0.55, ease: 'power2.out' }),
    y: gsap.quickTo(shape, 'y', { duration: 0.55, ease: 'power2.out' }),
  }));

  const tick = () => {
    const cursor = getCursor();
    shapes.forEach((shape, i) => {
      const rect = shape.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      if (!cursor.active) {
        quickTos[i].x(0);
        quickTos[i].y(0);
        return;
      }
      const dx = cx - cursor.x;
      const dy = cy - cursor.y;
      const dist = Math.hypot(dx, dy);
      if (dist > REACH || dist === 0) {
        quickTos[i].x(0);
        quickTos[i].y(0);
        return;
      }
      const falloff = (1 - dist / REACH) ** 2;
      const offset = falloff * MAX_DISP;
      quickTos[i].x((dx / dist) * offset);
      quickTos[i].y((dy / dist) * offset);
    });
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    shapes.forEach((shape) => {
      gsap.to(shape, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    });
  };
};

/* ─── Variant C — Constellation
 * Shapes do a slow y-axis breath (±4px, 6s, phase-offset) and are otherwise
 * still. When cursor enters the hero, a dedicated SVG overlay draws thin
 * brick-60% lines to the 3 nearest shapes, distance-weighted opacity,
 * fade out past 280px. Lines are <line> elements updated via setAttribute
 * on the gsap ticker — no per-frame tweens. */
export const variantConstellation: VariantFn = (shapes, getCursor, container) => {
  const REACH = 280;
  const NEAREST_COUNT = 3;

  const breaths: gsap.core.Tween[] = [];
  shapes.forEach((shape, i) => {
    breaths.push(
      gsap.to(shape, {
        y: '+=4',
        duration: 6,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: -(i * 0.9) % 6,
      }),
    );
  });

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
    const cursor = getCursor();
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
      const opacity = (1 - node.dist / REACH) * 0.6;
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
    breaths.forEach((t) => t.kill());
    svg.remove();
    gsap.set(shapes, { x: 0, y: 0 });
  };
};

export const variants: Record<VariantId, VariantFn> = {
  A: variantDrift,
  B: variantScatter,
  C: variantConstellation,
};
