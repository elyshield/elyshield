// ArShield .arshield constants — wire format of the container + key derivation.
// Copied 1:1 from the audited arshield-mcp package to make /app fully functional.

export const MAGIC = new Uint8Array([0x41, 0x52, 0x53, 0x48, 0x44]); // "ARSHD"
export const MAGIC_LEN = 5;
export const VERSION = 1;
export const ALGO_ID = { HYBRID_V1: 0x0001 } as const;

export const FILE_CONTEXT = 'arshield-v1-file';
export const MESSAGE_CONTEXT = 'arshield-v1-message';
export const X402_CONTEXT = 'arshield-v1-x402';
export const HKDF_SALT = 'arshield-v1';
export const HKDF_SALT_HYBRID = 'arshield-v1-hybrid';
export const HKDF_INFO_MLKEM_SEED = 'mlkem-seed';
export const HKDF_INFO_X25519_SEED = 'x25519-seed';
export const HKDF_INFO_MLDSA_SEED = 'mldsa-seed';
export const HKDF_INFO_AES_KEY = 'aes-256-gcm';
export const HKDF_INFO_KEYFILE_WRAP = 'keyfile-wrap-key';
export const KEYFILE_AAD = 'arshield-keyfile-v1';
export const WALLET_KDF_MESSAGE = 'arshield-key-derivation-v1';

export const ML_KEM_SEED_LEN = 64;
export const ML_KEM_PK_LEN = 1184;
export const ML_KEM_SK_LEN = 2400;
export const ML_KEM_CT_LEN = 1088;
export const X25519_PK_LEN = 32;
export const X25519_SK_LEN = 32;
export const ML_DSA_SEED_LEN = 32;
export const ML_DSA_PK_LEN = 1952;
export const ML_DSA_SK_LEN = 4032;
export const ML_DSA_SIG_LEN = 3309;
export const AES_KEY_LEN = 32;
export const NONCE_LEN = 12;
export const AES_GCM_TAG_LEN = 16;

export const ARGON2ID_PARAMS_PROD = { t: 3, m: 65536, p: 1 } as const;
export const ARGON2ID_SALT_LEN = 16;

export const MAX_MESSAGE_PLAINTEXT = 64 * 1024;

export const ARSHIELD_DERIVATION_MESSAGE =
  'ArShield keypair derivation v1\n' +
  '\n' +
  'This signature derives your personal post-quantum encryption keypair.\n' +
  'It grants no permissions and costs no gas.\n' +
  '\n' +
  'Domain: arc-shield.xyz';

export const MESSAGE_URL_BASE = 'https://arc-shield.xyz/m/#';
export const MESSAGE_URL_PREFIX = 'v1.';

// The $arshield token on ARC. Set NEXT_PUBLIC_ARSHIELD_CONTRACT to this address;
// the tier gate reads balanceOf against it, and the site shows it next to the
// Buy button. Kept as a fallback so the address is never lost if the env var is
// unset at build time.
export const ARSHIELD_CONTRACT: string =
  '0xD4BF098BD463D868E86ef7ea068EBF9dF03cE639';
/** Where holders buy: the Argus token page for this contract. */
export const ARSHIELD_BUY_URL =
  'https://argus.world/token/0xD4BF098BD463D868E86ef7ea068EBF9dF03cE639';
export const ARC_CHAIN_ID = 5042;
export const ARC_CHAIN_ID_HEX = '0x13b2';
export const ARC_RPC = 'https://rpc.mainnet.arc.io';