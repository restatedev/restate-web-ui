export function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToUtf8(base64: string) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function utf8ToBase64(str: string) {
  const bytes = new TextEncoder().encode(str); // UTF-8 → bytes
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b))); // bytes → binary string
  return btoa(binary); // binary string → Base64
}

export function decode(bytes: Uint8Array) {
  return bytesToBase64(bytes);
}
