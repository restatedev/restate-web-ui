export function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToUtf8(base64?: string) {
  if (!base64) {
    return base64;
  }
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function utf8ToBase64(str?: string) {
  if (!str) {
    return str;
  }
  const bytes = new TextEncoder().encode(str); // UTF-8 → bytes
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b))); // bytes → binary string
  return btoa(binary); // binary string → Base64
}

export function hexToBase64(hex?: string) {
  if (!hex) {
    return undefined;
  }
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }

  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));

  return btoa(binary);
}

export function base64ToHex(base64: string) {
  // Decode Base64 → binary string
  const binary = atob(base64);

  // Binary string → hex
  let hex = '';
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
  }

  return hex;
}

export function hexToUint8Array(hex: string) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }

  return array;
}

export function base64ToUint8Array(base64?: string) {
  if (base64 === undefined) {
    return new Uint8Array();
  }
  const binary = atob(base64); // Base64 → binary string
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

export function binaryToUtf8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

export function base64ToUtf8OrOriginal(base64?: string) {
  if (!base64) {
    return base64;
  }
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));

  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    return decoder.decode(bytes);
  } catch {
    return base64;
  }
}
