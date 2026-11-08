/**
 * Background orbit. Four elliptical rings rotating at different speeds and
 * directions, each carrying a bead and a trailing arc.
 *
 * Visibility matters more than subtlety here. The first version used a border
 * alpha around 0.17, which is technically on screen and practically invisible
 * against the page's near-black — the effect existed in the DOM and could not be
 * seen, which is the worst of both states. The alphas below are tuned so the
 * rings read as a system at normal viewing distance while still sitting behind
 * the headline rather than competing with it.
 *
 * Motion is rotation on the ring's own axis: the ring is a rounded shape, so
 * turning it carries the bead around the ellipse and the hairline border looks
 * identical frame to frame, which is what makes the movement read as an orbit
 * instead of a rotating rectangle.
 *
 * All CSS keyframes on transform. No JS, no requestAnimationFrame, nothing on
 * the main thread. Wrapped in `motion-safe:` so reduced-motion visitors get the
 * rings, static.
 */

const RINGS = [
  // w, h, tilt, duration, reverse, bead, ring alpha, bead alpha
  { w: 1180, h: 440, rot: -16, dur: 46, reverse: false, bead: 6, ring: 0.30, dot: 0.85 },
  { w: 900, h: 330, rot: 10, dur: 34, reverse: true, bead: 5, ring: 0.24, dot: 0.75 },
  { w: 640, h: 240, rot: -6, dur: 25, reverse: false, bead: 4.5, ring: 0.19, dot: 0.65 },
  { w: 400, h: 150, rot: 18, dur: 17, reverse: true, bead: 3.5, ring: 0.14, dot: 0.55 },
];

/**
 * `subtle` is for inner pages. The landing hero can carry a full-size orbit
 * because the headline is the only thing in that space; on /app, /chat or a docs
 * page the rings would sit directly behind form fields and body text, so they
 * drop to roughly a third of the alpha and lose the two innermost rings. Same
 * component, same motion, different claim on the reader's attention.
 */
export function BackgroundOrbit({ subtle = false }: { subtle?: boolean }) {
  const rings = subtle ? RINGS.slice(0, 2) : RINGS;
  const fade = subtle ? 0.34 : 1;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* A soft core so the rings are read against light rather than against
          flat black. Without it the hairlines look like scratches. */}
      <div
        className="absolute left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `radial-gradient(circle at center, rgba(105,250,233,${0.10 * fade}), rgba(45,217,209,${0.045 * fade}) 38%, transparent 68%)`,
        }}
      />

      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        {rings.map((r, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: r.w,
              height: r.h,
              left: -r.w / 2,
              top: -r.h / 2,
              transform: `rotate(${r.rot}deg)`,
            }}
          >
            {/* Static ring: the path itself. */}
            <div
              className="absolute inset-0 rounded-[50%]"
              style={{
                border: `1px solid rgba(105,250,233,${r.ring * fade})`,
                boxShadow: `inset 0 0 60px -24px rgba(105,250,233,${r.ring * 1.6 * fade}), 0 0 24px -12px rgba(105,250,233,${r.ring * 0.9 * fade})`,
              }}
            />

            {/* Rotating layer: carries the bead around the ellipse. */}
            <div
              className="absolute inset-0 rounded-[50%] motion-safe:animate-[as-orbit_var(--dur)_linear_infinite]"
              style={
                {
                  '--dur': `${r.dur}s`,
                  animationDirection: r.reverse ? 'reverse' : 'normal',
                } as React.CSSProperties
              }
            >
              {/* Bead at the ellipse's 12 o'clock. */}
              <span
                className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: r.bead,
                  height: r.bead,
                  background: '#d4fffa',
                  boxShadow: `0 0 ${r.bead * 4}px ${r.bead}px rgba(105,250,233,${r.dot * fade})`,
                }}
              />

              {/* Comet tail trailing the bead, so rotation has a readable
                  direction rather than looking like a spinning dot. */}
              <span
                className="absolute left-1/2 top-0 -translate-x-1/2"
                style={{
                  width: Math.max(1.5, r.bead * 0.7),
                  height: r.h * 0.55,
                  background: `linear-gradient(to bottom, rgba(164,251,243,${r.dot * 0.55 * fade}), rgba(105,250,233,${r.dot * 0.18 * fade}) 45%, transparent 78%)`,
                  filter: 'blur(1px)',
                  borderRadius: '40%',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
