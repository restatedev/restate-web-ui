import { base64ToUint8Array } from '@restate/util-binary';
import { sha256 } from 'js-sha256';

export function stateVersion(
  state: {
    name: string;
    value: string;
  }[],
) {
  try {
    return stateVersionInternal(state);
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

function stateVersionInternal(
  state: {
    name: string;
    value: string;
  }[],
) {
  const kvs = state
    .map(
      ({ name, value }) =>
        [new TextEncoder().encode(name), base64ToUint8Array(value)] as [
          Uint8Array,
          Uint8Array,
        ],
    )
    .sort(([a], [b]) => compareBytes(a, b));

  const chunks: Uint8Array[] = [];

  for (const [i, [k, v]] of kvs.entries()) {
    // Convert index to 64-bit big-endian bytes
    const indexBuffer = new ArrayBuffer(8);
    new DataView(indexBuffer).setBigUint64(0, BigInt(i), false);

    // Build entry components
    chunks.push(
      new Uint8Array(indexBuffer),
      new Uint8Array([0x01]),
      k,
      new Uint8Array([0x02]),
      v,
      new Uint8Array([0x03]),
    );
  }
  // TODO: remove third party lib
  const hash = sha256.arrayBuffer(mergeUint8Arrays(chunks));
  return bufferToUrlSafe(hash);
}

function compareBytes(a: Uint8Array, b: Uint8Array) {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return a.length - b.length;
}

function bufferToUrlSafe(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function mergeUint8Arrays(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}
