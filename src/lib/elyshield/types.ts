/** Typed error hierarchy for ElyShield. Every failure mode is a named class so
 * callers and agents can branch on `.code` instead of matching message text. */

export class ElyShieldError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ElyShieldError';
  }
}

export class InvalidPassphraseError extends ElyShieldError {
  constructor() {
    super('Wrong passphrase or corrupted key file', 'INVALID_PASSPHRASE');
    this.name = 'InvalidPassphraseError';
  }
}

export class CorruptFileError extends ElyShieldError {
  constructor(detail: string) {
    super(`Corrupt or invalid .elyshield file: ${detail}`, 'CORRUPT_FILE');
    this.name = 'CorruptFileError';
  }
}

export class SignatureError extends ElyShieldError {
  constructor() {
    super('Signature verification failed', 'SIGNATURE_FAILED');
    this.name = 'SignatureError';
  }
}

/* --- Key shapes --- */
export type MlKemKeyPair = { publicKey: Uint8Array; secretKey: Uint8Array };

export type ElyShieldPublicKey = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

export type ElyShieldSecretKey = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

export type ElyShieldKeyPair = {
  publicKey: ElyShieldPublicKey;
  secretKey: ElyShieldSecretKey;
};

export type ElyShieldSeeds = {
  mlkem: Uint8Array;
  x25519: Uint8Array;
  mldsa: Uint8Array;
};

/** The parsed .elyshield container. */
export type ElyShieldContainer = {
  version: number;
  algoId: number;
  kemCtPq: Uint8Array;
  kemCtCls: Uint8Array;
  nonce: Uint8Array;
  aeadPayload: Uint8Array;
  signature: Uint8Array;
};

/** The wrapped keyfile JSON structure. */
export type ElyShieldKeyfile = {
  v: 1;
  kdf: 'argon2id';
  kdfParams: { t: number; m: number; p: number };
  salt: string;
  nonce: string;
  wrapped: string;
};
