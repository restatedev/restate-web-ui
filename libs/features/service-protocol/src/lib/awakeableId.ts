import { bytesToBase64 } from '@restate/util-binary';

const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INVOCATION_ID_PATTERN = /^inv_1([0-9a-zA-Z]{11})([0-9a-zA-Z]{22})$/;
const MAX_SIGNAL_INDEX = 0xffffffff;

function decodeIdComponent(value: string, byteLength: number) {
  let remaining = [...value].reduce(
    (result, char) => result * 62n + BigInt(BASE62_ALPHABET.indexOf(char)),
    0n,
  );
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return remaining === 0n ? bytes : undefined;
}

export function getAwakeableId(invocationId: string, signalIndex: number) {
  const [, partitionKey, invocationUuid] =
    INVOCATION_ID_PATTERN.exec(invocationId) ?? [];
  if (
    !partitionKey ||
    !invocationUuid ||
    !Number.isInteger(signalIndex) ||
    signalIndex < 0 ||
    signalIndex > MAX_SIGNAL_INDEX
  ) {
    return undefined;
  }

  const partitionKeyBytes = decodeIdComponent(partitionKey, 8);
  const invocationUuidBytes = decodeIdComponent(invocationUuid, 16);
  if (!partitionKeyBytes || !invocationUuidBytes) {
    return undefined;
  }

  const bytes = new Uint8Array(28);
  bytes.set(partitionKeyBytes, 0);
  bytes.set(invocationUuidBytes, 8);
  new DataView(bytes.buffer).setUint32(24, signalIndex);

  const base64Url = bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `sign_1${base64Url}`;
}
