'use client';

import type { ReactNode } from 'react';

/**
 * No entrance animation.
 *
 * Both of these used to wrap every block in a framer-motion fade-up: the hero
 * staggered five of them in sequence (0ms, 120ms, 240ms, 360ms, 500ms) and every
 * section below faded in again as it scrolled into view. The combined effect was
 * a page that visibly assembles itself, five times, then keeps re-animating as
 * you read it — which is the "busy" half of why the site felt fussy.
 *
 * Content that is already on screen does not need to announce that it arrived.
 * A single motion moment is worth keeping; a page that moves everything it owns
 * is noise. The one motion moment now lives in the background orbit, which is
 * continuous rather than an entrance.
 *
 * The API is unchanged so every call site keeps compiling, and the props are
 * still accepted (and ignored) rather than removed — deleting `delay` from ~30
 * call sites would be churn for no visible benefit.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function HeroItem({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
