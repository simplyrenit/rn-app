/**
 * SHA-256 (FIPS 180-4), fed in pieces, so a video is hashed a chunk at a time and never held whole in memory (ENG-350).
 * ponytail: pure JS, since the app has no native crypto module and adding one means a native rebuild. Hermes hashes
 * a few MB a second; a native digest (expo-crypto) is the upgrade if a long clip ever waits on it.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export class Sha256 {
  private h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  private w = new Uint32Array(64);
  private block = new Uint8Array(64);
  private held = 0;
  private length = 0;

  update(bytes: Uint8Array): this {
    this.length += bytes.length;
    let at = 0;
    if (this.held > 0) {
      const take = Math.min(64 - this.held, bytes.length);
      this.block.set(bytes.subarray(0, take), this.held);
      this.held += take;
      at = take;
      if (this.held < 64) return this;
      this.compress(this.block, 0);
      this.held = 0;
    }
    for (; at + 64 <= bytes.length; at += 64) this.compress(bytes, at);
    this.block.set(bytes.subarray(at), 0);
    this.held = bytes.length - at;
    return this;
  }

  /** The digest, as 32 bytes. Call once, after the last `update`. */
  digest(): Uint8Array {
    const bits = this.length * 8;
    const pad = new Uint8Array((this.held < 56 ? 56 : 120) - this.held + 8);
    pad[0] = 0x80;
    const view = new DataView(pad.buffer);
    view.setUint32(pad.length - 8, Math.floor(bits / 2 ** 32));
    view.setUint32(pad.length - 4, bits >>> 0);
    this.update(pad);
    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    this.h.forEach((word, i) => outView.setUint32(i * 4, word));
    return out;
  }

  private compress(bytes: Uint8Array, at: number) {
    // Plain locals and no allocation per block: this loop is most of the time spent under Hermes's interpreter.
    const w = this.w;
    const h = this.h;
    for (let i = 0, j = at; i < 16; i++, j += 4) w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15];
      const y = w[i - 2];
      w[i] =
        w[i - 16] +
        (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) +
        w[i - 7] +
        (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10));
    }
    let a = h[0] | 0;
    let b = h[1] | 0;
    let c = h[2] | 0;
    let d = h[3] | 0;
    let e = h[4] | 0;
    let f = h[5] | 0;
    let g = h[6] | 0;
    let k = h[7] | 0;
    for (let i = 0; i < 64; i++) {
      const t1 =
        (k + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += k;
  }
}

export const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function toBase64(bytes: Uint8Array): string {
  let text = "";
  for (const b of bytes) text += String.fromCharCode(b);
  return globalThis.btoa(text);
}
