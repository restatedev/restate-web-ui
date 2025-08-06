import { sha256 } from 'js-sha256';

export function stateVersion(
  state: {
    name: string;
    value: string;
  }[]
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
  }[]
) {
  const kvs = [...state]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      ({ name, value }) =>
        [new TextEncoder().encode(name), new TextEncoder().encode(value)] as [
          Uint8Array,
          Uint8Array
        ]
    );

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
      new Uint8Array([0x03])
    );
  }
  // TODO: remove third party lib
  const hash = sha256.arrayBuffer(mergeUint8Arrays(chunks));
  return bufferToUrlSafe(hash);
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
