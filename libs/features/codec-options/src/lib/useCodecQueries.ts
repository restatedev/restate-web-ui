import { useQueries, useQuery, type QueryKey } from '@tanstack/react-query';
import { convertStateToObject } from '@restate/data-access/admin-api-hooks';
import type { RestateCodecOptions } from './types';
import { useCodecRuntime } from './useCodecRuntime';

function safeParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (error) {
    if (value === '') {
      return undefined;
    }

    return value;
  }
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

      return {
        data: {
          state: convertStateToObject(
            results.filter(Boolean).map((result, index) => ({
              value: safeParse(result.data ?? ''),
              name: state.at(index)?.name ?? '',
            })),
          ),
          version,
        },
        error:
          codecRuntime.error ?? results.find((result) => result.error)?.error,
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
    error: codecRuntime.error ?? query.error,
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
    error: codecRuntime.error ?? query.error,
  };
}
