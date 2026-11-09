'use client';

/**
 * Plan entitlements: what the connected wallet is entitled to.
 *
 * Four plans, decided by the USD value of the $ELYSHIELD the wallet holds.
 *
 *   balance  Elysium RPC, eth_call balanceOf(address) against the token
 *            contract. This is the part a price feed cannot fake.
 *   price    USD per token, used only to convert a token count into the USD
 *            figure the thresholds are expressed in.
 *
 * Everything degrades rather than hard-failing. A gate that locks paying
 * holders out because a third party is briefly down is worse than a gate that
 * is briefly generous, so:
 *
 *   price reachable   → balance × live price → plan
 *   price unreachable → balance × fallback   → plan
 *   no price at all   → Free
 *
 * With no contract configured every wallet reads as Free. That is the correct
 * default: before the token exists there is nothing to hold, and claiming
 * otherwise would grant paid limits for free.
 *
 * This is a soft gate — it shapes the interface and the counters in the
 * browser. It is not a security boundary and is not meant to be one; nothing
 * here protects a file, the crypto does that.
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

export type TierKey = 'free' | 'holder' | 'pro' | 'whale';

export type Tier = {
  key: TierKey;
  name: string;
  /** Minimum USD value of held $ELYSHIELD. */
  minUsd: number;
  /** Daily envelopes. Infinity means unlimited. */
  encryptionsPerDay: number;
  /** Largest file accepted. Infinity means no plan cap. */
  maxFileBytes: number;
  /** One line for the plan card. */
  blurb: string;
};

export const TIERS: Tier[] = [
  {
    key: 'free',
    name: 'Free',
    minUsd: 0,
    encryptionsPerDay: 3,
    maxFileBytes: 25 * MB,
    blurb: 'No token needed. Seal a few files a day to try it.',
  },
  {
    key: 'holder',
    name: 'Holder',
    minUsd: 20,
    encryptionsPerDay: 25,
    maxFileBytes: 100 * MB,
    blurb: 'For holding $ELYSHIELD. The day-to-day plan.',
  },
  {
    key: 'pro',
    name: 'Pro',
    minUsd: 100,
    encryptionsPerDay: 250,
    maxFileBytes: GB,
    blurb: 'Heavy use: larger files, hundreds of envelopes a day.',
  },
  {
    key: 'whale',
    name: 'Whale',
    minUsd: 1000,
    encryptionsPerDay: Infinity,
    maxFileBytes: Infinity,
    blurb: 'No daily cap and no size cap. For desks and archives.',
  },
];

export const TIER_BY_KEY = Object.fromEntries(TIERS.map((t) => [t.key, t])) as Record<TierKey, Tier>;

/** The plan a wallet with no balance, or an unreadable one, resolves to. */
export const ACTIVE_TIER: Tier = TIER_BY_KEY.free;

/* ---- configuration -------------------------------------------------------- */

/**
 * The $ELYSHIELD contract on Elysium.
 *
 * Empty until the token is deployed. While empty every wallet reads as Free,
 * because there is nothing to hold — set NEXT_PUBLIC_ELYSHIELD_CONTRACT (or the
 * constant below) once the address exists and the gate starts resolving real
 * plans with no other code change.
 */
export const ELYSHIELD_CONTRACT = (
  process.env.NEXT_PUBLIC_ELYSHIELD_CONTRACT ??
  // Deployed address goes here.
  ''
)
  .trim()
  .toLowerCase();

/**
 * Elysium RPC endpoints, tried in order.
 *
 * The first is the canonical one; the rest are fallbacks for a failed call.
 * Multiple endpoints because a single public RPC failing should degrade the
 * plan read, not break the page.
 */
export const ELYSIUM_RPCS: string[] = [
  'https://rpc.elysiumchain.tech',
  'https://elysium-rpc.polkachu.com',
];

/** Elysium mainnet chain id. */
export const ELYSIUM_CHAIN_ID = 99901;

/**
 * Used when no live price is available: the launch price in USD.
 *
 * Zero means an unreachable price feed resolves everyone to Free — the safe
 * direction, but it will annoy holders, so set it before launch.
 */
export const ELYSHIELD_USD_FALLBACK = Number(
  process.env.NEXT_PUBLIC_ELYSHIELD_USD_FALLBACK ?? '0',
);

const TOKEN_DECIMALS = 18;

const PRICE_CACHE_MS = 60_000;
const BALANCE_CACHE_MS = 30_000;

/* ---- on-chain balance ----------------------------------------------------- */

/** First four bytes of keccak256("balanceOf(address)"). */
const SEL_BALANCE_OF = '0x70a08231';

function padAddress(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

/**
 * Read balanceOf over Elysium, trying each RPC in turn.
 *
 * Returns the raw amount as bigint, or null when every endpoint failed. Null
 * rather than 0 on purpose: "we could not read it" and "you hold none" lead to
 * different decisions, and collapsing them would silently demote a holder.
 */
async function readBalance(address: string): Promise<bigint | null> {
  if (!ELYSHIELD_CONTRACT) return null;

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_call',
    params: [{ to: ELYSHIELD_CONTRACT, data: SEL_BALANCE_OF + padAddress(address) }, 'latest'],
  });

  for (const rpc of ELYSIUM_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: string; error?: unknown };
      if (json.error || typeof json.result !== 'string') continue;
      if (json.result === '0x') return BigInt(0);
      return BigInt(json.result);
    } catch {
      // A failing RPC is expected, not exceptional. Try the next one.
    }
  }
  return null;
}

/* ---- price ---------------------------------------------------------------- */

/**
 * USD per $ELYSHIELD.
 *
 * The spot price is only used to convert units — what decides entitlement is
 * the balance read. A manipulated price would have to be accompanied by
 * actually holding the tokens at call time.
 */
async function readPriceUsd(): Promise<number | null> {
  if (!ELYSHIELD_CONTRACT) return null;
  try {
    const res = await fetch(
      `https://api.elysiumchain.tech/market/price?address=${ELYSHIELD_CONTRACT}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { price?: string | number };
    const n = Number(json?.price);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/* ---- caches --------------------------------------------------------------- */

type Cache<T> = { at: number; value: T };

let priceCache: Cache<number | null> | null = null;
let balanceCache: Cache<bigint | null> | null = null;
let balanceCacheFor = '';

function fresh<T>(c: Cache<T> | null, maxAge: number): boolean {
  return !!c && Date.now() - c.at < maxAge;
}

/* ---- public API ----------------------------------------------------------- */

/**
 * Addresses granted the top plan regardless of balance.
 *
 * Useful before the token exists, when everyone would otherwise read as Free and
 * the daily cap gets in the way of testing the app end to end.
 */
export const TEST_UNLIMITED: ReadonlySet<string> = new Set([
  '0xaece0ab2a46f31209f4c6381f20a5af218fda176',
]);

export function isTestUnlimited(address?: string | null): boolean {
  return !!address && TEST_UNLIMITED.has(address.toLowerCase());
}

/** Map a USD holding to a plan. Thresholds ascend, so take the highest match. */
export function tierFromUsd(usd: number): Tier {
  if (!Number.isFinite(usd) || usd <= 0) return TIER_BY_KEY.free;
  const found = [...TIERS].reverse().find((t) => usd >= t.minUsd);
  return found ?? TIER_BY_KEY.free;
}

export type TierState = {
  tier: Tier;
  /** Whole tokens held; 0 when unknown. */
  balance: number;
  /** USD value of that holding; 0 when unknown. */
  usd: number;
  /** Where the number came from, so the UI can be honest about it. */
  priceSource: 'live' | 'fallback' | 'none';
  /** False when the balance read failed — the plan is then only a floor. */
  balanceKnown: boolean;
};

export async function fetchTierState(address?: string | null): Promise<TierState> {
  const none: TierState = {
    tier: ACTIVE_TIER,
    balance: 0,
    usd: 0,
    priceSource: 'none',
    balanceKnown: true,
  };

  if (!address || !ELYSHIELD_CONTRACT) return none;
  if (isTestUnlimited(address)) {
    return { tier: TIER_BY_KEY.whale, balance: 0, usd: 0, priceSource: 'none', balanceKnown: true };
  }

  // Balance and price are independent reads; run them together.
  if (!fresh(balanceCache, BALANCE_CACHE_MS) || balanceCacheFor !== address) {
    balanceCache = { at: Date.now(), value: await readBalance(address) };
    balanceCacheFor = address;
  }
  if (!fresh(priceCache, PRICE_CACHE_MS)) {
    priceCache = { at: Date.now(), value: await readPriceUsd() };
  }

  const raw = balanceCache?.value ?? null;
  if (raw === null) {
    // Balance unreadable: stay on Free and say so, rather than pretend.
    return { ...none, balanceKnown: false };
  }

  const balance = Number(raw) / 10 ** TOKEN_DECIMALS;
  const live = priceCache?.value ?? null;
  const price = live ?? (ELYSHIELD_USD_FALLBACK > 0 ? ELYSHIELD_USD_FALLBACK : null);
  const priceSource: TierState['priceSource'] = live !== null ? 'live' : price !== null ? 'fallback' : 'none';

  if (price === null) {
    // Held tokens but no price: cannot place them in a plan, so Free with the
    // balance still shown. Silent promotion would be worse.
    return { tier: ACTIVE_TIER, balance, usd: 0, priceSource, balanceKnown: true };
  }

  const usd = balance * price;
  return { tier: tierFromUsd(usd), balance, usd, priceSource, balanceKnown: true };
}

/** Convenience wrapper when only the plan is needed. */
export async function fetchTier(address?: string | null): Promise<Tier> {
  return (await fetchTierState(address)).tier;
}

/** "Holder · 25 / 24h · 100 MB" */
export function tierLabel(tier: Tier): string {
  const cap = Number.isFinite(tier.encryptionsPerDay) ? `${tier.encryptionsPerDay} / 24h` : 'Unlimited';
  const size = Number.isFinite(tier.maxFileBytes) ? `${Math.round(tier.maxFileBytes / MB)} MB` : 'No cap';
  return `${tier.name} · ${cap} · ${size}`;
}

/** Human size for a plan cap, in the units the value actually needs. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return 'No cap';
  if (bytes >= GB) return `${Math.round(bytes / GB)} GB`;
  return `${Math.round(bytes / MB)} MB`;
}

/** Human daily cap for a plan. */
export function formatDaily(perDay: number): string {
  return Number.isFinite(perDay) ? `${perDay} / 24h` : 'Unlimited';
}

/* ---- daily counter (localStorage, resets 00:00 UTC) ----------------------- */

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
