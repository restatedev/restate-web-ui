const decoder = new TextDecoder('utf-8');

export function decode(bytes: Uint8Array) {
  return decoder.decode(bytes);
}
