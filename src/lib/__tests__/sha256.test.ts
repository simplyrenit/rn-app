import { describe, expect, it } from "@jest/globals";
import { createHash } from "crypto";
import { Sha256, toBase64, toHex } from "../sha256";

const node = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest();

/** Bytes that are not all alike, so a wrong word order would show. */
const bytesOf = (length: number) => Uint8Array.from({ length }, (_, i) => (i * 131 + (i >> 8)) & 0xff);

describe("SHA-256, as the bucket checks it (ENG-350)", () => {
  it("matches Node's for every length around the block and padding edges", () => {
    for (let length = 0; length <= 200; length++) {
      const bytes = bytesOf(length);
      expect(toHex(new Sha256().update(bytes).digest())).toBe(node(bytes).toString("hex"));
    }
    expect(toHex(new Sha256().update(new TextEncoder().encode("abc")).digest())).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("gives the same digest however the bytes are cut into pieces", () => {
    const bytes = bytesOf(300_000);
    for (const piece of [1, 7, 63, 64, 65, 1000, 65_537]) {
      const hash = new Sha256();
      for (let at = 0; at < bytes.length; at += piece) hash.update(bytes.subarray(at, at + piece));
      expect(toHex(hash.digest())).toBe(node(bytes).toString("hex"));
    }
  });

  it("writes the base64 the checksum header takes", () => {
    const bytes = bytesOf(10);
    expect(toBase64(new Sha256().update(bytes).digest())).toBe(node(bytes).toString("base64"));
  });
});
