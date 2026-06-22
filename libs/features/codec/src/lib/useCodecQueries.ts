import { useQueries, useQuery, type QueryKey } from '@tanstack/react-query';
import { convertStateToObject } from '@restate/data-access/admin-api-hooks';
import { base64ToUint8Array } from '@restate/util/binary';
import { combineErrors } from '@restate/util/errors';
import type { RestateCodecOptions } from './types';
import { useCodecRuntime } from './useCodecRuntime';

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    if (value === '') {
      return undefined;
    }

    return value;
  }
}

function isBinaryStateValue(base64Value: string) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(
      base64ToUint8Array(base64Value),
    );
    return false;
  } catch {
    return true;
  }
}

export type DecodedStateValue = {
  text: string;
  parsed: unknown;
  defaultFormat: 'text' | 'binary';
};

function getDefaultStateValueFormat(
  base64Value: string | undefined,
  isBase64: boolean | undefined,
): DecodedStateValue['defaultFormat'] {
  if (!isBase64 || !base64Value) {
    return 'text';
  }

  return isBinaryStateValue(base64Value) ? 'binary' : 'text';
}

export function useDecodeState(
  state: {
    name: string;
    value: string;
  }[] = [],
  version?: string,
  isBase64?: boolean,
  codecOptions?: RestateCodecOptions,
) {
  const codecRuntime = useCodecRuntime(codecOptions);

  return useQueries({
    queries: state.map(({ value }) => ({
      queryKey: [value, 'decode', codecRuntime.options] as const,
      queryFn: async ({ queryKey }: { queryKey: QueryKey }) => {
        const [decodedValue, , decodedCodecOptions] = queryKey;

        return codecRuntime.decode(
          decodedValue as string,
          decodedCodecOptions as RestateCodecOptions,
        );
      },
      staleTime: Infinity,
      refetchOnMount: false,
      placeholderData: value,
      enabled: Boolean(isBase64 && !codecRuntime.isPending),
      initialData: isBase64 ? undefined : value,
    })),
    combine: (results) => {
      const isPlaceholderData = results.some(
        (result) => result.isPlaceholderData,
      );
      const values = results.map((result, index) => {
        const item = state.at(index);
        const text = result.data ?? '';
        const value: DecodedStateValue = {
          text,
          parsed: safeParse(text),
          defaultFormat: getDefaultStateValueFormat(item?.value, isBase64),
        };

        return {
          name: item?.name ?? '',
          value,
        };
      });

      return {
        data: {
          values: convertStateToObject(values),
          version,
        },
        error: combineErrors(
          results.find((result) => result.error)?.error,
          codecRuntime.error,
        ),
        isPlaceholderData,
        isPending:
          codecRuntime.isPending || results.some((result) => result.isFetching),
      };
    },
  });
}

export function useDecode(
  value?: string,
  isBase64?: boolean,
  codecOptions?: RestateCodecOptions,
) {
  const codecRuntime = useCodecRuntime(codecOptions);
  const query = useQuery({
    queryKey: [value, 'decode', codecRuntime.options] as const,
    queryFn: () =>
      isBase64 ? codecRuntime.decode(value, codecRuntime.options) : value,
    staleTime: Infinity,
    refetchOnMount: false,
    enabled: !codecRuntime.isPending,
  });

  return {
    ...query,
    isPending: codecRuntime.isPending || query.isPending,
    error: combineErrors(query.error, codecRuntime.error),
  };
}

export function useEncode(
  value?: string,
  isBase64?: boolean,
  codecOptions?: RestateCodecOptions,
) {
  const codecRuntime = useCodecRuntime(codecOptions);
  const query = useQuery({
    queryKey: [value, 'encode', codecRuntime.options] as const,
    queryFn: () =>
      isBase64 ? codecRuntime.encode(value, codecRuntime.options) : value,
    staleTime: Infinity,
    refetchOnMount: false,
    enabled: !codecRuntime.isPending,
  });

  return {
    ...query,
    isPending: codecRuntime.isPending || query.isPending,
    error: combineErrors(query.error, codecRuntime.error),
  };
}
