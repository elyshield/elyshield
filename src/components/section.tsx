import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

/**
 * Section shell.
 *
 * Two things were removed here on purpose.
 *
 * The eyebrow pill: an ALL-CAPS, wide-tracked, outlined capsule floating above
 * every heading. There were forty of those on the page. That treatment is the
 * single most recognisable generated-page tic — it decorates rather than
 * informs, and because it was on every section it flattened the page's rhythm
 * into "pill, heading, subtitle" repeated nine times.
 *
 * `eyebrow` survives as a prop so call sites keep compiling, but it now renders
 * as a quiet mono coordinate — small, sentence case, sitting on the rule that
 * separates sections. It is information (where you are in the argument), not
 * ornament, and it no longer competes with the heading.
 *
 * Sections are separated by a hairline instead of being spaced apart by air.
 * Rules make a long page read as a document with a structure; margins alone
 * make it read as a stack.
 */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  align = 'center',
  rule = true,
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  align?: 'center' | 'left';
  rule?: boolean;
}) {
  const isLeft = align === 'left';

  return (
    <section id={id} className={cn('relative scroll-mt-20', className)}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {rule && <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" />}
        <div className={cn('py-16 sm:py-24', isLeft ? '' : '')}>
          {(eyebrow || title) && (
            <div className={cn('mb-12', isLeft ? 'max-w-2xl' : 'max-w-3xl')}>
              {eyebrow && (
                <Reveal>
                  <p className="mb-4 font-mono text-[11px] tracking-[0.02em] text-[#77839a]">
                    {eyebrow}
                  </p>
                </Reveal>
              )}
              {title && (
                <Reveal delay={0.05}>
                  <h2
                    className={cn(
                      'text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#e8ecf2] sm:text-[34px]',
                    )}
                  >
                    {title}
                  </h2>
                </Reveal>
              )}
              {subtitle && (
                <Reveal delay={0.1}>
                  <p className="mt-4 max-w-xl text-balance text-[14.5px] leading-[1.65] text-[#8a93a3]">
                    {subtitle}
                  </p>
                </Reveal>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
