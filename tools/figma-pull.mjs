#!/usr/bin/env node
/**
 * Pull the Renit design file from the Figma REST API.
 *
 * The MCP server is paywalled on the Starter plan; the REST API is not, so this
 * is how the fidelity audit gets its reference data.
 *
 * Reads the token from FIGMA_TOKEN or ~/.config/figma-token. The token is never
 * printed, never passed on argv (argv is visible to other processes), and never
 * written into any output file.
 *
 *   node tools/figma-pull.mjs tree      # frame inventory -> design/figma/tree.json
 *   node tools/figma-pull.mjs images    # render every frame -> design/figma/*.png
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const FILE_KEY = "c7VIWG8Q8661rjNsau0Ijk";
const OUT = "design/figma";

function token() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  const p = join(homedir(), ".config", "figma-token");
  if (existsSync(p)) return readFileSync(p, "utf8").trim();
  console.error(
    "No token. Put it in ~/.config/figma-token (chmod 600) or export FIGMA_TOKEN."
  );
  process.exit(1);
}

const api = async (path) => {
  const r = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { "X-Figma-Token": token() },
  });
  if (!r.ok) {
    // Deliberately does not echo the request headers.
    console.error(`Figma API ${r.status} ${r.statusText} on ${path}`);
    process.exit(1);
  }
  return r.json();
};

/** Frames worth auditing: a top-level frame on the page, or one inside a section. */
function collectFrames(node, out = [], depth = 0) {
  if (!node) return out;
  const isScreen =
    node.type === "FRAME" &&
    node.absoluteBoundingBox &&
    node.absoluteBoundingBox.width >= 200 &&
    node.absoluteBoundingBox.width <= 800 &&
    node.absoluteBoundingBox.height >= 400;
  if (isScreen) {
    out.push({
      id: node.id,
      name: node.name,
      w: Math.round(node.absoluteBoundingBox.width),
      h: Math.round(node.absoluteBoundingBox.height),
    });
    return out; // don't descend into a screen; its children are its contents
  }
  (node.children || []).forEach((c) => collectFrames(c, out, depth + 1));
  return out;
}

const cmd = process.argv[2] || "tree";
mkdirSync(OUT, { recursive: true });

if (cmd === "tree") {
  const doc = await api(`/files/${FILE_KEY}?depth=4`);
  const frames = collectFrames(doc.document);
  writeFileSync(
    join(OUT, "tree.json"),
    JSON.stringify({ name: doc.name, lastModified: doc.lastModified, frames }, null, 2)
  );
  console.log(`${frames.length} screen frames -> ${OUT}/tree.json`);
  frames.slice(0, 40).forEach((f) => console.log(`  ${f.id}  ${f.w}x${f.h}  ${f.name}`));
} else if (cmd === "images") {
  const { frames } = JSON.parse(readFileSync(join(OUT, "tree.json"), "utf8"));
  // The images endpoint caps how many ids it will render per call.
  for (let i = 0; i < frames.length; i += 25) {
    const batch = frames.slice(i, i + 25);
    const ids = batch.map((f) => f.id).join(",");
    const { images } = await api(`/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=png&scale=2`);
    for (const f of batch) {
      const url = images[f.id];
      if (!url) { console.warn(`no render for ${f.name}`); continue; }
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const safe = f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      writeFileSync(join(OUT, `${safe}__${f.id.replace(":", "-")}.png`), buf);
    }
    console.log(`rendered ${Math.min(i + 25, frames.length)}/${frames.length}`);
  }
} else {
  console.error("usage: figma-pull.mjs [tree|images]");
  process.exit(1);
}
