'use client';

import { useCallback, useEffect, useState } from 'react';
import { ELYSHIELD_DERIVATION_MESSAGE, identityFromWalletSignature, type ElyShieldKeyPair } from '@/lib/elyshield';
import {
  ELYSIUM_CHAIN_ID,
  ELYSIUM_CHAIN_ID_HEX,
  ELYSIUM_CHAIN_NAME,
  ELYSIUM_EXPLORER,
  ELYSIUM_NATIVE_SYMBOL,
  ELYSIUM_RPC,
} from '@/lib/elyshield/constants';

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

export function getInjected(): Eip1193 | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export type WalletState = { address: string; chainId: string } | null;

/** Params for wallet_addEthereumChain — Elysium pays gas in HYPE. */
const ELYSIUM_CHAIN_PARAMS = {
  chainId: ELYSIUM_CHAIN_ID_HEX,
  chainName: ELYSIUM_CHAIN_NAME,
  nativeCurrency: { name: ELYSIUM_NATIVE_SYMBOL, symbol: ELYSIUM_NATIVE_SYMBOL, decimals: 18 },
  rpcUrls: [ELYSIUM_RPC],
  blockExplorerUrls: [ELYSIUM_EXPLORER],
};

function isElysium(chainId: string | undefined | null): boolean {
  if (!chainId) return false;
  return chainId.toLowerCase() === ELYSIUM_CHAIN_ID_HEX || chainId === String(ELYSIUM_CHAIN_ID);
}

/**
 * Minimal EIP-1193 hook.
 *
 * Connecting asks the wallet to be on Elysium (adding the chain if it is
 * unknown) so the header can show a network the user recognises. Signing does
 * not: EIP-191 personal_sign hashes the message and the address only, so the
 * derived keypair is identical whichever network the wallet happens to be on.
 * The signature call therefore never touches the chain — which also means a
 * wallet that refuses to switch networks can still seal and open files.
 */
export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(null);
  const [deriving, setDeriving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ensureElysium = useCallback(async (provider: Eip1193): Promise<void> => {
    let chainId = (await provider.request({ method: 'eth_chainId' })) as string;
    if (isElysium(chainId)) return;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ELYSIUM_CHAIN_ID_HEX }],
      });
    } catch (e) {
      // 4902 = chain not added to the wallet yet.
      const code = (e as { code?: number })?.code;
      if (code === 4902 || code === -32603) {
        await provider.request({ method: 'wallet_addEthereumChain', params: [ELYSIUM_CHAIN_PARAMS] });
      } else {
        throw e;
      }
    }
    chainId = (await provider.request({ method: 'eth_chainId' })) as string;
    if (!isElysium(chainId)) {
      throw new Error(`Switch to ${ELYSIUM_CHAIN_NAME} (${ELYSIUM_CHAIN_ID}). Current: ${chainId}`);
    }
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    const provider = getInjected();
    if (!provider) {
      setError(
        `No injected wallet found. Install MetaMask, then connect to add ${ELYSIUM_CHAIN_NAME} automatically.`
      );
      return;
    }
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      await ensureElysium(provider);
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string;
      setWallet({ address: accounts[0], chainId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ensureElysium]);

  const disconnect = useCallback(() => setWallet(null), []);

  /**
   * Sign the fixed derivation message and turn it into a keypair.
   *
   * Deliberately does not call ensureElysium: the signature is chain-independent,
   * and forcing a network switch here is what used to make every seal/open ask
   * the wallet to change networks mid-flow.
   */
  const deriveIdentity = useCallback(async (): Promise<ElyShieldKeyPair> => {
    const provider = getInjected();
    if (!provider) throw new Error('No wallet found');
    const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
    if (!accounts?.[0]) throw new Error('Wallet not connected');
    setDeriving(true);
    try {
      const signatureHex = (await provider.request({
        method: 'personal_sign',
        params: [ELYSHIELD_DERIVATION_MESSAGE, accounts[0]],
      })) as string;
      return identityFromWalletSignature(signatureHex);
    } finally {
      setDeriving(false);
    }
  }, []);

  useEffect(() => {
    const provider = getInjected();
    if (!provider) return;
    const onAccounts = () => setWallet(null);
    const onChain = () => setWallet(null);
    const ep = provider as unknown as { on?: (e: string, cb: () => void) => void; removeListener?: (e: string, cb: () => void) => void };
    ep.on?.('accountsChanged', onAccounts);
    ep.on?.('chainChanged', onChain);
    return () => {
      ep.removeListener?.('accountsChanged', onAccounts);
      ep.removeListener?.('chainChanged', onChain);
    };
  }, []);

  return { wallet, deriving, error, mounted, connect, disconnect, deriveIdentity };
}
