import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Shared motion tunables — every downstream animation composes against these
 * so timings stay coherent across Hero, Nav, Manifesto, Work, ScrollLightRail.
 */
const LENIS_DURATION = 1.1;
const LENIS_WHEEL_MULTIPLIER = 1;
const LENIS_TOUCH_MULTIPLIER = 1.4;
const RAF_TIME_SCALE = 1000;

type MotionHandles = {
  lenis: Lenis;
  destroy: () => void;
};

let activeHandles: MotionHandles | null = null;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mirrors adaptiv's ease — a fast-out exponential curve that keeps momentum
 * alive without the rubbery overshoot of elastic easings.
 */
const expoOut = (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export function initMotion(): MotionHandles | null {
  if (typeof window === 'undefined') return null;
  if (activeHandles) return activeHandles;
  if (prefersReducedMotion()) {
    gsap.registerPlugin(ScrollTrigger);
    return null;
  }

  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    duration: LENIS_DURATION,
    smoothWheel: true,
    wheelMultiplier: LENIS_WHEEL_MULTIPLIER,
    touchMultiplier: LENIS_TOUCH_MULTIPLIER,
    easing: expoOut,
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);

  const raf = (time: number) => lenis.raf(time * RAF_TIME_SCALE);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  const handles: MotionHandles = {
    lenis,
    destroy: () => {
      gsap.ticker.remove(raf);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      activeHandles = null;
    },
  };
  activeHandles = handles;
  return handles;
}

export function getLenis(): Lenis | null {
  return activeHandles?.lenis ?? null;
}
