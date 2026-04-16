import type { RestateCodecOptions } from '@restate/features/codec';
import {
  base64ToUint8Array,
  bytesToBase64,
  uint8ArrayToUtf8OrBase64,
  utf8ToUint8Array,
} from '@restate/util/binary';

type RestateBinaryPayload = Uint8Array<ArrayBufferLike>;

export type RestateBinaryCodec = (
  value?: RestateBinaryPayload,
  options?: RestateCodecOptions,
) =>
  | Promise<RestateBinaryPayload | undefined>
  | RestateBinaryPayload
  | undefined;

type RestateStringCodec = (
  value?: string,
  options?: RestateCodecOptions,
) => Promise<string | undefined> | string | undefined;

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
  return (value, options) => {
    return codecs
      .reduce<Promise<RestateBinaryPayload | undefined>>(
        (currentValue, codec) =>
          currentValue.then((resolvedValue) =>
            Promise.resolve(codec(resolvedValue, options)),
          ),
        Promise.resolve(
          value === undefined ? undefined : base64ToUint8Array(value),
        ),
      )
      .then((resolvedValue) =>
      uint8ArrayToUtf8OrBase64(resolvedValue),
      );
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
  return (value, options) => {
    return codecs
      .reduce<Promise<RestateBinaryPayload | undefined>>(
        (currentValue, codec) =>
          currentValue.then((resolvedValue) =>
            Promise.resolve(codec(resolvedValue, options)),
          ),
        Promise.resolve(utf8ToUint8Array(value)),
      )
      .then((resolvedValue) =>
      resolvedValue === undefined ? undefined : bytesToBase64(resolvedValue),
      );
  };
}
