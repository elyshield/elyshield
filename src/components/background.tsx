/**
 * The page surface.
 *
 * What was here: three large radial glows (blue, aqua, and a leftover gold one)
 * drifting over a 64px technical grid. That combination is the default dark
 * gradient backdrop — it appears behind every AI product page regardless of
 * what the product does, and because the glows were large and soft the whole
 * viewport sat at the same low contrast, which is a large part of why the site
 * read as flat and stiff.
 *
 * What replaces it:
 *
 *   1. A vertical value ramp. The top of the page is slightly lifted and the
 *      bottom falls away. It costs nothing, it is not a "glow", and it gives the
 *      viewport a floor and a ceiling instead of one even wash.
 *   2. One oblique light-leak from the upper right — not a circle. A clipped
 *      diagonal reads as light falling across a surface rather than a lamp
 *      behind it.
 *   3. Film grain. A tiled SVG turbulence at very low opacity. This is the part
 *      that does most of the work: it breaks up the banding that large dark
 *      gradients always have on an 8-bit display, and it gives the flat fills
 *      something to sit on.
 *   4. A vignette so the edges settle rather than ending abruptly.
 *
 * No grid. A grid under a hero is a texture applied to hide emptiness; the hero
 * has real content in it now.
 */
export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#020712]">
      {/* Value ramp: lifted top, falling base. Kept gentle on purpose — a
          strong vertical ramp behind text creates a visible band the eye reads
          as a mistake, so the step between stops is small and the fall is
          spread across the whole page height. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #081426 0%, #050e1c 22%, #030a15 46%, #020711 70%, #01040c 100%)',
        }}
      />

      {/* One oblique light-leak, upper right. */}
      <div
        className="absolute -right-[18%] -top-[26%] h-[46rem] w-[62rem] opacity-[0.5]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 62% 42%, rgba(105,250,233,0.14), rgba(45,217,209,0.06) 42%, transparent 72%)',
          transform: 'rotate(-16deg)',
          filter: 'blur(8px)',
        }}
      />

      {/* A colder, much weaker counter-light low left so the page is not lit
          from a single side. Almost invisible; it just stops the bottom falling
          into pure black. */}
      <div
        className="absolute -bottom-[30%] -left-[14%] h-[40rem] w-[52rem] opacity-[0.35]"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 40% 55%, rgba(15,158,151,0.10), transparent 70%)',
        }}
      />

      {/* Film grain — the anti-banding layer. */}
      <div
        className="absolute inset-0 opacity-[0.055] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          backgroundSize: '140px 140px',
        }}
      />

      {/* Vignette. Deliberately weak: at 0.55 it was flattening the value ramp
          back to a single tone everywhere except dead centre, which is exactly
          the "one even wash" it was supposed to fix. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 135% 105% at 50% 42%, transparent 55%, rgba(1,4,10,0.34) 100%)',
        }}
      />
    </div>
  );
}
