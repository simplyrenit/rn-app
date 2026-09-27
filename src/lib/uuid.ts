/**
 * RFC 4122 v4 identifiers — listing attempts and analytics sessions.
 *
 * `uuid` is only a transitive dependency here, so this avoids importing it.
 * `crypto.getRandomValues` is polyfilled by react-native-get-random-values
 * (imported in App.tsx); the Math.random branch only exists so the module
 * still works under Jest and in the rare case the polyfill is not loaded yet.
 * Neither use needs cryptographic strength — only uniqueness.
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  const cryptoLike = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoLike?.getRandomValues) {
    cryptoLike.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
}
