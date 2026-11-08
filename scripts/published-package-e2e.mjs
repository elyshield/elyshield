#!/usr/bin/env node
/**
 * End-to-end test against the PUBLISHED package, not the local build.
 *
 * Encrypt and decrypt both go through the binary npm served, launched over stdio
 * the way a real MCP client launches it. The core library is used for exactly
 * one thing: minting the two passphrase-protected keyfiles, because the server
 * deliberately exposes no keyfile-generation tool — keys are made in the app and
 * consumed here.
 *
 * Proves, in order: the binary starts, exposes six tools, encrypts, uses the
 * ELYSD magic, leaks no plaintext, decrypts byte-for-byte, and rejects both a
 * foreign keyfile and a tampered container.
 */

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const PKG = process.env.ELYSHIELD_MCP_PKG ?? 'elyshield-mcp@0.1.4';
const PASS_A = 'published-package-test-A-2026';
const PASS_B = 'published-package-test-B-2026';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/** The published server, spoken to over stdio. */
function client() {
  const child = spawn('npx', ['--yes', PKG], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let buf = '', nextId = 1;

  child.stdout.on('data', (d) => {
    buf += d;
    for (let i; (i = buf.indexOf('\n')) >= 0; ) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      const slot = pending.get(msg.id);
      if (!slot) continue;
      pending.delete(msg.id);
      msg.error ? slot.reject(new Error(JSON.stringify(msg.error))) : slot.resolve(msg.result);
    }
  });

  const call = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`timeout: ${method}`));
    }, 180_000);
  });

  return {
    call,
    /** tools/call, with an isError reply surfaced as a rejection. */
    async tool(name, args) {
      const r = await call('tools/call', { name, arguments: args });
      const text = r?.content?.[0]?.text ?? '';
      if (r?.isError) throw new Error(text.slice(0, 80));
      return JSON.parse(text);
    },
    close: () => child.kill(),
  };
}

const rpc = client();

try {
  const init = await rpc.call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'published-e2e', version: '1.0' },
  });
  check('published binary starts and initializes', !!init?.serverInfo,
    `${init?.serverInfo?.name}@${init?.serverInfo?.version}`);

  const tools = (await rpc.call('tools/list', {})).tools.map((t) => t.name);
  check('exposes 6 elyshield_* tools',
    tools.length === 6 && tools.every((n) => n.startsWith('elyshield_')), `${tools.length} tools`);

  // Keyfiles come from core, resolved relative to this script — no absolute path.
  const core = await import(
    pathToFileURL(new URL('../packages/core/dist/index.js', import.meta.url).pathname).href
  );

  // Seed lengths differ per primitive: ML-KEM 64, x25519 and ML-DSA 32.
  const seed = () => ({
    mlkem: crypto.randomBytes(core.ML_KEM_SEED_LEN),
    x25519: crypto.randomBytes(core.X25519_SK_LEN),
    mldsa: crypto.randomBytes(core.ML_DSA_SEED_LEN),
  });
  const kfA = await core.wrapKeyfile(core.keysFromSeeds(seed()), PASS_A);
  const kfB = await core.wrapKeyfile(core.keysFromSeeds(seed()), PASS_B);
  check('minted two independent keyfiles', !!kfA && !!kfB);

  const plaintext = Buffer.from(
    `ELYSHIELD PUBLISHED-PACKAGE E2E\nmarker: ${crypto.randomUUID()}\npayload: ${'Z'.repeat(3000)}\n`,
  );

  const enc = await rpc.tool('elyshield_encrypt_file', {
    data_base64: plaintext.toString('base64'),
    filename: 'published-e2e.txt',
    keyfile_json: JSON.stringify(kfA),
    passphrase: PASS_A,
  });
  const container = Buffer.from(enc.container_b64url, 'base64url');

  check('encrypt_file returned a container', container.length > plaintext.length,
    `${container.length} B / ${plaintext.length} B plaintext`);
  check('container magic is ELYSD', container.subarray(0, 5).toString('latin1') === 'ELYSD');
  check('plaintext does not appear in container', !container.includes(plaintext.subarray(0, 40)));

  const dec = await rpc.tool('elyshield_decrypt_file', {
    container_b64url: enc.container_b64url,
    keyfile_json: JSON.stringify(kfA),
    passphrase: PASS_A,
  });
  check('decrypt_file returns the exact original bytes',
    Buffer.from(dec.data_b64, 'base64').equals(plaintext), `${plaintext.length} B`);
  check('filename is recovered', dec.filename === 'published-e2e.txt', `"${dec.filename}"`);
  check('original_size is correct', Number(dec.original_size) === plaintext.length);

  // The two properties that matter most: a foreign key cannot open it, and a
  // modified container is refused rather than partially decrypted.
  const rejects = async (args) => {
    try { await rpc.tool('elyshield_decrypt_file', args); return null; }
    catch (e) { return String(e.message).slice(0, 48); }
  };

  check('second keyfile CANNOT open it',
    !!(await rejects({
      container_b64url: enc.container_b64url,
      keyfile_json: JSON.stringify(kfB), passphrase: PASS_B,
    })));

  const tampered = Buffer.from(container);
  tampered[tampered.length - 200] ^= 0xff;
  check('tampered container is rejected',
    !!(await rejects({
      container_b64url: tampered.toString('base64url'),
      keyfile_json: JSON.stringify(kfA), passphrase: PASS_A,
    })));

} catch (e) {
  check('suite ran to completion', false, String(e.message).slice(0, 100));
} finally {
  rpc.close();
}

const pass = results.filter(Boolean).length;
const fail = results.length - pass;
console.log(`\n${'─'.repeat(50)}\nPASS: ${pass}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
