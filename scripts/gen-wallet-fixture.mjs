// Regenerate the wallet signature fixture used by scripts/wallet-e2e.mjs.
//
// The fixture is a signature over the CURRENT derivation message. It has to be
// regenerated whenever that message changes — which is exactly what happened
// when the project moved to elyshield/Elysium: the domain
// line inside the message changed, so every previously stored signature stopped
// matching, and with it every keypair derived from one.
//
// Throws away key material on purpose: this is Anvil's well-known account #0,
// never funded on any real chain.
import { Wallet, verifyMessage } from 'ethers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = await import(path.join(root, 'packages/core/dist/index.js'));

const ANVIL_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new Wallet(ANVIL_PK);
const sig = await wallet.signMessage(core.ELYSHIELD_DERIVATION_MESSAGE);

const recovered = verifyMessage(core.ELYSHIELD_DERIVATION_MESSAGE, sig);
if (recovered.toLowerCase() !== wallet.address.toLowerCase()) {
  throw new Error(`fixture does not recover: ${recovered} != ${wallet.address}`);
}

console.log('message:');
console.log(JSON.stringify(core.ELYSHIELD_DERIVATION_MESSAGE));
console.log('\nSIG =', `'${sig}';`);
console.log(`ADDR = '${wallet.address}';`);
