import { bytesToBase64 } from '@restate/util/binary';

export function decode(bytes: Uint8Array) {
  return bytesToBase64(bytes);
}
