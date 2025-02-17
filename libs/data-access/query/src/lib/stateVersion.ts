export async function stateVersion(
  state: {
    name: string;
    value: string;
    bytes: string;
  }[]
) {
  return stateVersionInternal(state).catch(() => undefined);
}

async function stateVersionInternal(
  state: {
    name: string;
    value: string;
    bytes: string;
  }[]
) {
  const kvs = [...state]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      ({ name, bytes }) =>
        [new TextEncoder().encode(name), hexToUint8Array(bytes)] as [
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

  const hash = await crypto.subtle.digest('SHA-256', mergeUint8Arrays(chunks));
  return bufferToUrlSafe(hash);
}

function hexToUint8Array(hexString: string) {
  const bytes = new Uint8Array(hexString.length / 2);

  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }

  return bytes;
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
