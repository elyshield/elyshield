'use client';

/**
 * Usage limits for the web app.
 *
 * There is no token and no chain read here any more. The $ELYSHIELD tier gate —
 * balanceOf over a chain plus a USD price feed — was removed with the move to
 * Elysium/ElyShield, so the limits below apply to everyone the same way and the
 * app has no on-chain dependency at all.
 *
 * When a token gate comes back, it belongs here as a single function that
 * returns a Tier for an address; nothing else in the app should need to change.
 */

const MB = 1024 * 1024;

export type Tier = {
  key: 'free';
  name: string;
  minUsd: number;
  encryptionsPerDay: number;
  maxFileBytes: number;
};

/**
 * One tier only. The names are kept because the UI, the docs pages and the
 * copy all reference them; dropping them would be a much larger change than
 * removing the token read.
 */
export const TIERS: Tier[] = [
  { key: 'free', name: 'Free', minUsd: 0, encryptionsPerDay: 25, maxFileBytes: 100 * MB },
];

export const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<Tier['key'], Tier>;

/** The single tier everyone resolves to while no token gate exists. */
export const ACTIVE_TIER: Tier = TIER_BY_KEY.free;

/* ---- public API ---------------------------------------------------------- */

export type TierState = {
  tier: Tier;
  /** Always 0: nothing is read from a chain any more. */
  balance: number;
  /** Always 0. */
  usd: number;
  /** Always 'none'. */
  priceSource: 'live' | 'fallback' | 'none';
  /** True: there is nothing to fail, so the limit is exact, not a floor. */
  balanceKnown: boolean;
};

/**
 * Resolve the tier for an address.
 *
 * Kept async and address-taking so every existing caller keeps working and so
 * re-introducing a token gate later is a change in this file alone.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchTierState(address?: string | null): Promise<TierState> {
  return {
    tier: ACTIVE_TIER,
    balance: 0,
    usd: 0,
    priceSource: 'none',
    balanceKnown: true,
  };
}

/** Convenience wrapper when only the tier is needed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchTier(address?: string | null): Promise<Tier> {
  return ACTIVE_TIER;
}

export function tierLabel(tier: Tier): string {
  const cap = Number.isFinite(tier.encryptionsPerDay) ? `${tier.encryptionsPerDay} / 24h` : 'Unlimited';
  const size = Number.isFinite(tier.maxFileBytes)
    ? `${Math.round(tier.maxFileBytes / MB)} MB`
    : 'No tier cap';
  return `${tier.name} · ${cap} · ${size}`;
}

/* ---- daily counter (localStorage, resets 00:00 UTC) ---------------------- */

const LS_KEY = 'elyshield:enc-count';

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function readCount(): { day: string; n: number } {
  if (typeof window === 'undefined') return { day: utcDayKey(new Date()), n: 0 };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { day: utcDayKey(new Date()), n: 0 };
    const parsed = JSON.parse(raw) as { day?: string; n?: number };
    const today = utcDayKey(new Date());
    if (parsed.day !== today) return { day: today, n: 0 };
    return { day: today, n: Number(parsed.n) || 0 };
  } catch {
    return { day: utcDayKey(new Date()), n: 0 };
  }
}

export function getEncryptionsUsedToday(): number {
  return readCount().n;
}

export function incrementEncryptionsUsed(): number {
  const { day, n } = readCount();
  const next = day === utcDayKey(new Date()) ? n + 1 : 1;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ day: utcDayKey(new Date()), n: next }));
  } catch {
    /* storage disabled */
  }
  return next;
}

export function canEncrypt(tier: Tier): boolean {
  if (!Number.isFinite(tier.encryptionsPerDay)) return true;
  return getEncryptionsUsedToday() < tier.encryptionsPerDay;
}

export function encryptionsLeft(tier: Tier): number | 'unlimited' {
  if (!Number.isFinite(tier.encryptionsPerDay)) return 'unlimited';
  return Math.max(0, tier.encryptionsPerDay - getEncryptionsUsedToday());
}
