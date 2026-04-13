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

export const variantDrift: VariantFn = noop;
export const variantScatter: VariantFn = noop;
export const variantConstellation: VariantFn = noop;

export const variants: Record<VariantId, VariantFn> = {
  A: variantDrift,
  B: variantScatter,
  C: variantConstellation,
};
