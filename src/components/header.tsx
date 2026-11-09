'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, Wallet, X } from 'lucide-react';
import { Button, sizes, variants } from './button';
import { cn } from '@/lib/utils';
import { useWallet } from '@/lib/use-wallet';
import { SocialLinks } from './social-links';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/*
        ElyShield mark: the aqua ribbon knot, used as a raster asset rather than
        a traced path. The artwork is a 3D gradient mark — highlights near-white
        mint falling to deep teal shadow — and potrace flattens that to a single
        flat fill, which is why this is an <img> and not an inline SVG path.
        public/brand/logo-mark.png is the transparent cut-out of the source art.
      */}
      <Image
        src="/brand/logo-mark.png"
        alt=""
        aria-hidden
        width={26}
        height={26}
        className="h-[26px] w-[26px] select-none"
        draggable={false}
        priority
      />
      <span className="text-[15px] font-medium tracking-tight text-[#e6e9ef]">ElyShield</span>
    </span>
  );
}

type NavItem = {
  href: string;
  label: string;
  /**
   * Rendered as a non-clickable element instead of a link. Used while a page
   * exists but should not be reachable yet — the route still builds, the nav
   * simply stops advertising a way in. Flip to false (or delete the field) to
   * open it again; nothing else has to change.
   */
  disabled?: boolean;
};

const NAV: NavItem[] = [
  // Agents leads the nav. It is the surface a first-time visitor can actually
  // use — no wallet, no setup, drop a file and it reads it — so it belongs
  // before the reference pages rather than after them.
  //
  // Currently closed: the route is built and browsable by URL, but the nav item
  // is inert until the page is ready to be the first thing a visitor lands on.
  { href: '/chat', label: 'Agents', disabled: true },
  { href: '/mcp', label: 'MCP' },
  { href: '/m', label: 'Messages' },
  { href: '/verify', label: 'Verify' },
  { href: '/#protocol', label: 'How it works' },
  { href: '/#limits', label: 'Limits' },
  { href: '/#shield', label: 'Shield' },
  { href: '/#faq', label: 'FAQ' },
];

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { wallet, error, mounted, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#020610]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ElyShield home" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((n) =>
            n.disabled ? (
              // Inert by design: no <a>, no href, so there is nothing to click,
              // middle-click, or open in a new tab. `aria-disabled` tells a
              // screen reader what the muted colour says visually.
              <span
                key={n.href}
                aria-disabled="true"
                title={`${n.label} — coming soon`}
                className="cursor-not-allowed text-[13px] font-normal text-[#5a6474]"
              >
                {n.label}
              </span>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className="text-[13px] font-normal text-[#9aa3b2] transition-colors hover:text-[#e6e9ef]"
              >
                {n.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block"><SocialLinks tone="quiet" showSoon={false} /></div>
          {mounted && wallet ? (
            <button
              onClick={disconnect}
              title={`Connected to Elysium (${wallet.chainId}) — click to disconnect`}
              className="inline-flex items-center gap-2 rounded-[3px] border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 text-[12.5px] font-medium text-emerald-300 transition-colors hover:border-emerald-400/50"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {shortAddr(wallet.address)}
            </button>
          ) : (
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={connect}>
              <Wallet className="h-4 w-4" />
              Connect wallet
            </Button>
          )}
          <Link href="/app" className={cn(
            'group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-medium transition-all duration-300',
            sizes.md, variants.primary,
          )}>
            Launch app
          </Link>
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-[#e6e9ef] lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="border-t border-red-500/20 bg-red-500/[0.06] px-4 py-2 text-center text-[12.5px] text-red-300">
          {error}
        </div>
      )}

      {open && (
        <div className="border-t border-white/[0.06] bg-[#020610] px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((n) =>
              n.disabled ? (
                <span
                  key={n.href}
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-lg px-3 py-2.5 text-sm text-[#5a6474]"
                >
                  {n.label}
                  <span className="ml-2 text-[11px] text-[#4a5361]">coming soon</span>
                </span>
              ) : (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-[#9aa3b2] hover:bg-white/[0.04] hover:text-white"
                >
                  {n.label}
                </Link>
              ),
            )}

            {/* The desktop X link is hidden on small screens, so the mobile menu
                carries it instead of dropping it. */}
            <div className="mt-2 flex items-center gap-3 px-3 py-1">
              <SocialLinks tone="bright" />
              <span className="text-[13px] text-[#9aa3b2]">Follow @elyshieldxyz</span>
            </div>

            {mounted && wallet ? (
              <button
                onClick={() => { setOpen(false); disconnect(); }}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2.5 text-sm font-medium text-emerald-300"
              >
                Disconnect · {shortAddr(wallet.address)}
              </button>
            ) : (
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => { setOpen(false); connect(); }}
              >
                <Wallet className="h-4 w-4" />
                Connect wallet
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}