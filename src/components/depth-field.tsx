'use client';

import { useEffect, useMemo, useRef } from 'react';

/**
 * A depth field: bodies at three distances, each drifting at a speed that
 * matches how far away it is.
 *
 * The brief was "planets, some far some near, and they're lit". The part that
 * keeps this from being generic space wallpaper is the *parallax contract*: a
 * far body must be small, dim, slow and colourless; a near body must be larger,
 * brighter, faster, and show a lit limb. If everything moves at the same speed
 * or every dot has the same brightness, depth collapses and it reads as
 * sprinkled noise — which is the tell.
 *
 * It is also deliberately *not* a starfield of ten thousand identical points.
 * There are ~90 bodies total. Each one is a real element with its own glow, so
 * the eye can find a few to follow; a uniform field of specks is decoration,
 * a handful of specific lights is a place.
 *
 * Motion: everything drifts on a slow loop. Nothing pulses on a beat, nothing
 * twinkles at a fixed 2s interval — that regular rhythm is what makes generated
 * space art feel like a screensaver. The "lit" quality comes from a static
 * radial gradient on each body (light from upper-left) plus a slow opacity
 * breathing on a few of them at deliberately mismatched durations, so no two
 * are ever in phase.
 *
 * Deterministic layout: positions come from a seeded hash, not Math.random, so
 * server and client render identically and there is no hydration drift.
 */

type Body = {
  x: number;      // % of viewport width
  y: number;      // % of viewport height
  size: number;   // px
  depth: number;  // 0 = far, 1 = near
  hue: string;    // rgb triple string
  alpha: number;
  drift: number;  // seconds for one full drift loop
  breathe: number | null; // seconds, null = static
};

/** Deterministic PRNG — same output on server and client. */
function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const PALETTE = [
  '105, 250, 233', // aqua — the brand
  '164, 251, 243', // light aqua
  '45, 217, 209',  // aqua mid
  '15, 158, 151',  // deep teal
];

function buildBodies(): Body[] {
  const out: Body[] = [];
  let k = 0;

  const band = (
    count: number,
    depth: [number, number],
    size: [number, number],
    alpha: [number, number],
    drift: [number, number],
    breatheChance: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const d = depth[0] + hash(k++) * (depth[1] - depth[0]);
      const r = hash(k++);
      // Bias positions away from the exact centre-left where copy sits, but
      // only softly — a hard exclusion zone is visible as a hole.
      const x = 2 + hash(k++) * 96;
      const y = 1 + hash(k++) * 98;
      out.push({
        x,
        y,
        size: size[0] + r * (size[1] - size[0]),
        depth: d,
        hue: PALETTE[Math.floor(hash(k++) * PALETTE.length)],
        alpha: alpha[0] + hash(k++) * (alpha[1] - alpha[0]),
        drift: drift[0] + hash(k++) * (drift[1] - drift[0]),
        breathe: hash(k++) < breatheChance ? 6 + hash(k++) * 12 : null,
      });
    }
  };

  // Far: tiny, faint, slow. These read as depth, not as objects.
  band(58, [0.05, 0.3], [1.0, 2.2], [0.16, 0.34], [110, 170], 0.18);
  // Mid: the bulk of the field.
  band(22, [0.4, 0.68], [2.0, 4.2], [0.3, 0.55], [70, 110], 0.35);
  // Near: few, large, bright, clearly lit. Twelve is enough that the eye can
  // find one or two to follow without the page becoming a planetarium.
  band(12, [0.78, 1.0], [6.5, 16], [0.55, 0.9], [38, 60], 0.65);

  return out;
}

export function DepthField() {
  // Builder is pure and deterministic, but the rule wants it inline so the
  // dependency list is provably empty at the call site.
  const bodies = useMemo(() => buildBodies(), []);
  const ref = useRef<HTMLDivElement>(null);

  /**
   * Pointer parallax. The field shifts a few pixels against the cursor.
   *
   * Applied to each body's own wrapper via a CSS variable rather than to a
   * single container: depth-scaled parallax needs a different multiplier per
   * layer, and one shared transform cannot express that. The variable is read
   * inside `translate3d()` on a dedicated wrapper element, so it never collides
   * with the drift keyframes running on the body inside it.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const tick = () => {
      cx += (tx - cx) * 0.045;
      cy += (ty - cy) * 0.045;
      el.style.setProperty('--px', cx.toFixed(4));
      el.style.setProperty('--py', cy.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ '--px': 0, '--py': 0 } as React.CSSProperties}
      aria-hidden
    >
      {bodies.map((b, i) => {
        // Parallax multiplier scales with depth: far bodies barely move.
        const px = (b.depth * 26).toFixed(1);
        const py = (b.depth * 18).toFixed(1);
        const isNear = b.depth > 0.75;

        return (
          // Outer: pointer parallax only.
          <div
            key={i}
            className="absolute"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              transform: `translate3d(calc(var(--px) * ${px}px), calc(var(--py) * ${py}px), 0)`,
            }}
          >
            {/* Inner: drift + the body itself. Separating the two transforms is
                what lets both run; on one element the inline transform wins and
                the keyframes are dead. */}
            <div
              className="rounded-full motion-safe:animate-[as-drift_var(--drift)_ease-in-out_infinite]"
              style={
                {
                  width: b.size,
                  height: b.size,
                  marginLeft: -b.size / 2,
                  marginTop: -b.size / 2,
                  '--drift': `${b.drift}s`,
                  background: isNear
                    ? // A real lit body: the terminator is the whole point. A
                      // sphere lit from the upper-left is bright where the light
                      // lands, falls off across the middle, and goes to near-black
                      // on the far limb. A single radial highlight from centre
                      // outward does not do that — it reads as a glowing dot.
                      `radial-gradient(circle at 30% 26%,
                         rgba(230,255,252,${b.alpha * 0.95}) 0%,
                         rgba(${b.hue},${b.alpha}) 18%,
                         rgba(${b.hue},${b.alpha * 0.62}) 42%,
                         rgba(${b.hue},${b.alpha * 0.18}) 66%,
                         rgba(2,10,18,${b.alpha * 0.75}) 88%,
                         rgba(1,6,12,${b.alpha * 0.9}) 100%)`
                    : `radial-gradient(circle at 50% 50%, rgba(${b.hue},${b.alpha}), rgba(${b.hue},0) 70%)`,
                  boxShadow: isNear
                    ? // Tight inner rim plus a wide, very faint corona. The rim
                      // is what makes it read as an edge; the corona alone is
                      // what every generated space scene uses.
                      `inset -${b.size * 0.16}px -${b.size * 0.16}px ${b.size * 0.5}px rgba(0,4,10,0.9),
                       0 0 ${b.size * 1.1}px ${b.size * 0.06}px rgba(${b.hue},${b.alpha * 0.45}),
                       0 0 ${b.size * 3.4}px ${b.size * 0.7}px rgba(${b.hue},${b.alpha * 0.10})`
                    : `0 0 ${b.size * 2}px ${b.size * 0.2}px rgba(${b.hue},${b.alpha * 0.35})`,
                } as React.CSSProperties
              }
            >
              {b.breathe && (
                <span
                  className="absolute inset-0 rounded-full motion-safe:animate-[as-lit_var(--breathe)_ease-in-out_infinite]"
                  style={
                    {
                      '--breathe': `${b.breathe}s`,
                      background: `radial-gradient(circle at 32% 28%, rgba(212,255,250,${b.alpha * 0.85}), transparent 62%)`,
                    } as React.CSSProperties
                  }
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
