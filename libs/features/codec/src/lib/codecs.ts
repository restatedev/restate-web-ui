import type {
  RestateBinaryCodec,
  RestateBinaryPayload,
  RestateCodecOptions,
} from './types';
import {
  base64ToUint8Array,
  bytesToBase64,
  uint8ArrayToUtf8OrBase64,
  utf8ToUint8Array,
} from '@restate/util/binary';

export type RestateStringCodec = (
  value?: string,
  options?: RestateCodecOptions,
) => Promise<string> | string;

/**
 * Execution order:
 * 1. Convert the incoming Base64 string into a `Uint8Array`.
 * 2. Run each decoder from left to right, awaiting one before passing its bytes to the next.
 * 3. Convert the final bytes to UTF-8.
 * 4. If UTF-8 decoding fails, return the final bytes as Base64 instead.
 */
export function composeRestateDecoder(
  codecs: readonly RestateBinaryCodec[],
): RestateStringCodec {
  return async (value, options) => {
    const resolvedValue = await codecs.reduce<Promise<RestateBinaryPayload>>(
      (currentValue, codec) =>
        currentValue.then((resolvedValue) =>
          Promise.resolve(codec(resolvedValue, options)),
        ),
      Promise.resolve(base64ToUint8Array(value)),
    );

    return uint8ArrayToUtf8OrBase64(resolvedValue);
  };
}

/**
 * Execution order:
 * 1. Convert the incoming UTF-8 string into a `Uint8Array`.
 * 2. Run each encoder from left to right, awaiting one before passing its bytes to the next.
 * 3. Convert the final bytes to Base64.
 */
export function composeRestateEncoder(
  codecs: readonly RestateBinaryCodec[],
): RestateStringCodec {
  return async (value, options) => {
    const resolvedValue = await codecs.reduce<Promise<RestateBinaryPayload>>(
      (currentValue, codec) =>
        currentValue.then((resolvedValue) =>
          Promise.resolve(codec(resolvedValue, options)),
        ),
      Promise.resolve(utf8ToUint8Array(value) ?? new Uint8Array()),
    );

    return bytesToBase64(resolvedValue);
  };
}
