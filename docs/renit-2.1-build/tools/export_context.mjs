// Read-only: save Figwright get_design_context (detail full) for each frame in figma/index.tsv to
// figma/<section>/<frameId>.json via the local Figwright leader's /rpc (needs the plugin open in Figma).
// Usage: node export_context.mjs [frameId ...]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(process.env.FIGWRIGHT_NM + '/');
const { encode, decode } = require('@msgpack/msgpack');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rows = fs.readFileSync(path.join(ROOT, 'figma/index.tsv'), 'utf8').trim().split('\n').slice(1).map(l => l.split('\t'));
const only = new Set(process.argv.slice(2));
let ok = 0, bad = [];
for (const [fid, sec] of rows) {
  if (only.size && !only.has(fid)) continue;
  const out = path.join(ROOT, 'figma', sec, fid.replace(':', '-') + '.json');
  if (!only.size && fs.existsSync(out)) { ok++; continue; }
  const res = await fetch('http://127.0.0.1:3055/rpc', { method: 'POST', headers: { 'content-type': 'application/msgpack' },
    body: encode({ requestId: 'ctx-' + fid, toolName: 'get_design_context', args: { nodeId: fid, detail: 'full', dedupeComponents: true } }) });
  const msg = decode(new Uint8Array(await res.arrayBuffer()));
  if (msg.kind !== 'ok') { bad.push(`${fid}: ${msg.code} ${msg.message}`); continue; }
  fs.writeFileSync(out, JSON.stringify(msg.result, null, 1)); ok++;
}
console.log(JSON.stringify({ ok, bad }));
