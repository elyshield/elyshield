import Link from 'next/link';
import { Logo } from './header';
import { SocialLinks } from './social-links';

const COLS = [
  {
    title: 'Product',
    links: [
      { href: '/chat', label: 'Agents' },
      { href: '/app', label: 'Launch app' },
      { href: '/mcp', label: 'MCP server' },
      { href: '/m', label: 'Messages' },
      { href: '/verify', label: 'Verify Seal' },
      { href: '/#limits', label: 'Limits' },
      { href: '/#shield', label: 'Shield (roadmap)' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs', label: 'Docs' },
      { href: '/docs/features', label: 'Features' },
      { href: '/docs/roadmap', label: 'Roadmap' },
      { href: '/#protocol', label: 'How it works' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: 'mailto:hello@elyshield.xyz', label: 'Contact' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#020610]">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#7b8493]">
              Security between agents. Post-quantum envelopes for files and messages, signatures for
              x402 receipts. MCP-native. Built for Elysium.
            </p>

            {/* Brighter than the header variant: this column has nothing
                competing with it, and the quiet version disappeared against the
                near-black background in review. */}
            <div className="mt-6">
              <SocialLinks tone="bright" />
            </div>

            <p className="mt-6 text-[11px] font-medium text-[#77839a]">
              elyshield.xyz
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-medium text-[#77839a]">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#9aa3b2] transition-colors hover:text-[#e6e9ef]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[13px] text-[#77839a] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ElyShield. Built for Elysium. Built on open-source noble cryptography.</p>
          <p className="font-medium text-[#7b8493]">
            Free to start. Four plans by holding $ELYSHIELD.
          </p>
        </div>
      </div>
    </footer>
  );
}