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

const noop: VariantFn = (shapes) => {
  gsap.set(shapes, { x: 0, y: 0 });
  return () => {};
};

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

export const variantScatter: VariantFn = noop;
export const variantConstellation: VariantFn = noop;

export const variants: Record<VariantId, VariantFn> = {
  A: variantDrift,
  B: variantScatter,
  C: variantConstellation,
};
