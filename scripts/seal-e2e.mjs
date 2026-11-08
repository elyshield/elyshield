#!/usr/bin/env node
/**
 * Seal a real file end-to-end and prove every property that matters.
 *
 * Not a unit test of one function: this creates an actual file on disk, seals it
 * with the same core the browser calls, then opens it again and byte-compares.
 * It also asserts the properties the product claims, because those are the ones
 * that silently regress:
 *
 *   - round trip     : decrypt(encrypt(x)) === x, byte for byte
 *   - filename       : survives the envelope
 *   - wrong key      : a different recipient is REJECTED, not silently empty
 *   - tamper         : flipping one ciphertext byte is REJECTED
 *   - wrong signer   : a foreign signer is REJECTED
 *   - not plaintext  : the original bytes do not appear in the envelope
 *   - size overhead  : reported, so a surprising jump is visible
 *
 * Run: node scripts/seal-e2e.mjs
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as core from '../packages/core/dist/index.js';

const dir = mkdtempSync(join(tmpdir(), 'elyshield-seal-'));
let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? '  — ' + detail : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`);
  }
}

async function expectReject(name, fn) {
  try {
    await fn();
    check(name, false, 'expected a rejection, but it succeeded');
  } catch (e) {
    check(name, true, `${e.constructor.name}: ${String(e.message).slice(0, 70)}`);
  }
}

const run = async () => {
  console.log('=== 1. real file on disk ===');
  // 40 KB of pseudo-random bytes: incompressible, and large enough that an
  // accidental truncation in the codec would show up as a length mismatch.
  const body = randomBytes(40 * 1024);
  const plaintext = Buffer.concat([Buffer.from('elyshield seal e2e\n'), body]);
  const inPath = join(dir, 'secret-doc.txt');
  writeFileSync(inPath, plaintext);
  const readBack = readFileSync(inPath);
  check('file written and read back', readBack.length === plaintext.length, `${readBack.length} bytes`);

  console.log('\n=== 2. two independent identities ===');
  const alice = core.ephemeralIdentity();   // recipient + signer
  const bob = core.ephemeralIdentity();     // stranger, used for the wrong-key test
  check('alice has ML-DSA public key', alice.publicKey.mldsa.length > 0, `${alice.publicKey.mldsa.length} bytes`);
  check('alice has ML-KEM public key', alice.publicKey.mlkem.length > 0, `${alice.publicKey.mlkem.length} bytes`);
  check('bob differs from alice', Buffer.compare(Buffer.from(bob.publicKey.mldsa), Buffer.from(alice.publicKey.mldsa)) !== 0);

  console.log('\n=== 3. seal ===');
  const t0 = performance.now();
  const sealed = await core.encryptFile(readBack, 'secret-doc.txt', alice.publicKey, alice.secretKey);
  const ms = performance.now() - t0;
  check('seal produced bytes', sealed.length > 0, `${sealed.length} bytes in ${ms.toFixed(0)}ms`);

  const sealedPath = join(dir, 'secret-doc.txt.elyshield');
  writeFileSync(sealedPath, sealed);
  check('envelope written to disk', readFileSync(sealedPath).length === sealed.length);

  console.log('\n=== 4. the plaintext must NOT be recoverable from the envelope ===');
  const sealedBuf = Buffer.from(sealed);
  const marker = Buffer.from('elyshield seal e2e\n');
  check('marker string absent from envelope', sealedBuf.indexOf(marker) === -1);
  // And no long run of the original data survives either.
  let leaked = 0;
  for (let i = 0; i + 32 <= body.length; i += 1024) {
    if (sealedBuf.indexOf(body.subarray(i, i + 32)) !== -1) leaked++;
  }
  check('no 32-byte plaintext block survives', leaked === 0, `${leaked} blocks found`);

  console.log('\n=== 5. open it again ===');
  const opened = await core.decryptFile(sealed, alice.secretKey, alice.publicKey);
  check('filename restored', opened.filename === 'secret-doc.txt', `"${opened.filename}"`);
  check('size restored', Number(opened.originalSize) === plaintext.length, `${opened.originalSize}`);
  const identical = Buffer.compare(Buffer.from(opened.fileBytes), plaintext) === 0;
  check('bytes identical to the original', identical, identical ? 'byte-for-byte match' : 'MISMATCH');

  console.log('\n=== 6. the envelope must reject everything that is not the right key ===');
  await expectReject('wrong recipient key rejected', () =>
    core.decryptFile(sealed, bob.secretKey, alice.publicKey));
  await expectReject('wrong expected signer rejected', () =>
    core.decryptFile(sealed, alice.secretKey, bob.publicKey));

  console.log('\n=== 7. tampering must be detected ===');
  // Flip one byte in the AEAD ciphertext (well past the KEM header).
  const tampered = Uint8Array.from(sealed);
  const mid = Math.floor(tampered.length * 0.75);
  tampered[mid] ^= 0x01;
  await expectReject('single flipped ciphertext byte rejected', () =>
    core.decryptFile(tampered, alice.secretKey, alice.publicKey));

  // Truncation must not "work" either.
  const truncated = sealed.slice(0, Math.floor(sealed.length * 0.5));
  await expectReject('truncated envelope rejected', () =>
    core.decryptFile(truncated, alice.secretKey, alice.publicKey));

  console.log('\n=== 8. size report ===');
  const overhead = sealed.length - plaintext.length;
  console.log(`  original : ${plaintext.length} bytes`);
  console.log(`  sealed   : ${sealed.length} bytes`);
  console.log(`  overhead : ${overhead} bytes (${((overhead / plaintext.length) * 100).toFixed(1)}%)`);
  check('overhead is bounded', overhead < 10000, `${overhead} bytes of header+signature`);

  console.log(`\n${'='.repeat(52)}`);
  console.log(`PASS: ${pass}   FAIL: ${fail}`);
  console.log('='.repeat(52));

  rmSync(dir, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
};

run().catch((e) => {
  console.error('\nHARNESS ERROR:', e);
  rmSync(dir, { recursive: true, force: true });
  process.exit(2);
});
