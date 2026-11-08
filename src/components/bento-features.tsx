'use client';

import { FileLock2, Fingerprint, Radio, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { Reveal } from './reveal';

/**
 * A ruled sheet, not a card grid.
 *
 * What was here before was the SaaS-card kit: every tile the same rounded-2xl
 * box, the same white/8 border, the same soft glow bleeding out of a corner.
 * Eight of those in a row is what makes a page read as generated — the shape
 * carries no information, so eight different claims arrive as one texture.
 *
 * This is the opposite: one continuous surface divided by hairlines, the way a
 * data sheet or a spec table is divided. The division itself says "these are
 * peers", the uneven spans say which claim leads, and nothing floats in a box
 * of its own. Icons lost their tinted squares for the same reason — a bordered
 * icon chip inside a bordered panel is a box in a box, and it was the busiest
 * thing on the page.
 */

const RULE = 'border-white/[0.07]';

export function BentoFeatures() {
  return (
    <div className={`grid grid-cols-1 overflow-hidden rounded-[4px] border ${RULE} bg-[#050b16]/60 md:grid-cols-6`}>
      {/* Leads the sheet: the identity story is the widest claim. */}
      <Reveal className="md:col-span-4">
        <div className={`group relative h-full p-7 ${RULE} border-b md:border-r`}>
          <div className="flex items-baseline gap-3">
            <Fingerprint className="h-4 w-4 flex-none text-action" strokeWidth={1.75} />
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#e8ecf2]">
              One identity, two doors
            </h3>
          </div>
          <p className="mt-3 max-w-xl text-[13.5px] leading-[1.65] text-[#8a93a3]">
            A wallet signature derives your keypair deterministically; a passphrase-wrapped key file
            holds a random one. Seal in the browser, open in your agent. Same keys, same{' '}
            <span className="font-mono text-[12.5px] text-[#c7cdd8]">.elyshield</span> format, no
            export step.
          </p>
          <dl className="mt-6 grid max-w-lg grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
            {[
              ['Wallet', 'EIP-191 personal_sign'],
              ['Key file', 'Argon2id t=3 · 64 MB'],
              ['Core', 'identical to MCP'],
            ].map(([k, v]) => (
              <div key={k} className="border-t border-white/[0.06] pt-2">
                <dt className="text-[11px] text-[#77839a]">{k}</dt>
                <dd className="mt-0.5 font-mono text-[11.5px] text-[#c7cdd8]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      {/* The verified claim gets the accent because it IS the differentiator. */}
      <Reveal delay={0.06} className="md:col-span-2">
        <div className={`relative h-full p-7 ${RULE} border-b`}>
          <div className="flex items-baseline gap-3">
            <ShieldCheck className="h-4 w-4 flex-none text-verified" strokeWidth={1.75} />
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[#e8ecf2]">
              No server, no plaintext
            </h3>
          </div>
          <p className="mt-3 text-[13.5px] leading-[1.65] text-[#8a93a3]">
            The web app is a static export. The MCP server runs on your machine. There is no
            ElyShield backend to breach, subpoena, or leak.
          </p>
          <p className="mt-5 font-mono text-[11.5px] text-verified">0 requests to our servers</p>
        </div>
      </Reveal>

      {/* Four compact claims, divided rather than boxed. */}
      {[
        {
          icon: FileLock2,
          title: 'Post-quantum by default',
          body: 'Not an opt-in mode. Every envelope is hybrid from the first byte.',
        },
        {
          icon: Terminal,
          title: 'MCP-native',
          body: 'Six tools over stdio for Claude, Cursor, and any MCP client.',
        },
        {
          icon: Zap,
          title: 'In-browser speed',
          body: 'ML-KEM-768 and X25519 run client-side, in pure JS with no WASM payload.',
        },
        {
          icon: Radio,
          title: 'Seals you can verify',
          body: 'A Quantum Seal PNG carries the envelope digest for offline checking.',
        },
      ].map((c, i) => (
        <Reveal key={c.title} delay={0.1 + i * 0.05} className="md:col-span-3">
          <div
            className={`h-full p-6 ${RULE} ${i < 2 ? 'border-b' : ''} ${
              i % 2 === 0 ? 'md:border-r' : ''
            }`}
          >
            <div className="flex items-baseline gap-3">
              <c.icon className="h-4 w-4 flex-none text-[#7c8798]" strokeWidth={1.75} />
              <h3 className="text-[14px] font-semibold text-[#e8ecf2]">{c.title}</h3>
            </div>
            <p className="mt-2 pl-7 text-[12.5px] leading-[1.6] text-[#8a93a3]">{c.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
