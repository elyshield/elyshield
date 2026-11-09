import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { DepthField } from '@/components/depth-field';
import './globals.css';

/**
 * IBM Plex Sans carries the site.
 *
 * Geist was here before and it is a fine face, but it is also the default of
 * every Next.js-app-router scaffold — a site wearing it reads as generated
 * before anyone has looked at the content. Plex is a technical grotesque with a
 * slightly humanist spine: it holds up in the 11-13px labels this UI leans on,
 * keeps real differentiation between weights, and has an engineering register
 * that suits a cryptography product better than a neutral UI default.
 */
const plexSans = localFont({
  src: './fonts/plex-sans-var.woff2',
  variable: '--font-plex-sans',
  weight: '100 700',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

const plexMono = localFont({
  src: './fonts/plex-mono-var.woff2',
  variable: '--font-plex-mono',
  weight: '100 700',
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

/**
 * Canonical origin.
 *
 * This is where the site actually lives right now. It used to point at
 * elyshield.xyz, which is not connected yet — that made every relative URL in
 * the metadata resolve against a domain that serves nothing, so link previews
 * on X, WhatsApp and Discord could fail to load their image. A preview that
 * silently degrades is the most visible way a site reads as unfinished, and it
 * only shows up when someone else shares your link.
 *
 * When the domain is attached, change this one value. Everything else —
 * canonical, og:url, sitemap, robots — derives from it.
 */
const SITE_URL = 'https://elyshield.pages.dev';

export const metadata: Metadata = {
  title: 'ElyShield | Post-Quantum Security Infrastructure on Elysium',
  description:
    'The post-quantum layer for data, messages and agents. Hybrid ML-KEM-768 + X25519 encryption, ML-DSA-65 signatures, zero backend. Built for Elysium.',
  metadataBase: new URL(SITE_URL),
  // Tells Google which URL is the real one. Without it, the same page reachable
  // from two hosts is treated as two pages competing with each other.
  alternates: { canonical: '/' },
  applicationName: 'ElyShield',
  authors: [{ name: 'ElyShield' }],
  creator: 'ElyShield',
  keywords: [
    'post-quantum encryption',
    'ML-KEM-768',
    'ML-DSA-65',
    'quantum-safe file encryption',
    'MCP server',
    'x402',
    'Elysium chain',
    'ElyShield',
  ],
  // Browser chrome on mobile matches the page instead of flashing white above a
  // near-black layout.
  themeColor: '#020610',
  openGraph: {
    title: 'The post-quantum layer for data, messages and agents.',
    description:
      'ElyShield seals it post-quantum, on your device. Your agents too. ML-KEM-768 + X25519 hybrid, ML-DSA-65 signed, MCP-native, built for Elysium.',
    url: SITE_URL,
    siteName: 'ElyShield',
    type: 'website',
    images: [{ url: '/seo/opengraph-image.png', width: 1200, height: 630, alt: 'ElyShield — post-quantum envelopes for files and agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The post-quantum layer for data, messages and agents.',
    description:
      'ElyShield seals it post-quantum, on your device. Your agents too. ML-KEM-768 + X25519 hybrid, ML-DSA-65 signed, MCP-native.',
    images: ['/seo/twitter-image.png'],
    site: '@elyshieldxyz',
    creator: '@elyshieldxyz',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

/**
 * Structured data so search engines understand this is a product, not a blog.
 * Values here are all verifiable from the site itself — no invented ratings or
 * award claims, which is both a Google guideline and just true.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ElyShield',
  applicationCategory: 'SecurityApplication',
  operatingSystem: 'Web, Linux, macOS, Windows',
  url: SITE_URL,
  description:
    'Post-quantum envelopes for files and messages. Hybrid ML-KEM-768 + X25519 encryption with ML-DSA-65 signatures, run entirely in the browser or as an MCP server.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier: 3 encryptions per day, 25 MB files. No account required.',
  },
  featureList: [
    'ML-KEM-768 + X25519 hybrid key encapsulation',
    'ML-DSA-65 signatures',
    'AES-256-GCM authenticated encryption',
    'MCP server for agents',
    'x402 payment receipt signing',
    'Runs client-side, no backend',
  ],
  sameAs: ['https://x.com/elyshieldxyz'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexMono.variable} font-sans`}>
        <script
          type="application/ld+json"
          // Static object authored here, not user input. Escaping `<` keeps the
          // JSON from closing the script tag early.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }}
        />
        {/*
          The depth field lives in the layout, not in each page. Eleven of the
          fifteen routes had no backdrop at all — /app, /chat, /mcp, /verify and
          every docs page rendered as flat black, which is what made them feel
          unfinished next to the landing page. One mounting point means a new
          route cannot forget it.
        */}
        <DepthField />
        {children}
      </body>
    </html>
  );
}