import type {
  RestateBinaryCodec,
  RestateBinaryPayload,
  RestateCodecOptions,
} from '@restate/features/codec';
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
