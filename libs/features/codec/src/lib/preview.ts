import {
  getDecodeServiceSerdeQueryOptions,
  getEncodeServiceSerdeQueryOptions,
} from '@restate/data-access/admin-api';
import type { operations } from '@restate/data-access/admin-api-spec';
import type { RestateBinaryCodec, RestateCodecOptions } from './types';
import { utf8ToUint8Array } from '@restate/util/binary';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

type SerdePreviewName =
  operations['decode_service_serde']['parameters']['path']['serdeName'];

const PREVIEW_METADATA_PREFIX = 'dev.restate.serde.preview.';

function isPreviewEnabled(
  metadata: Record<string, string> | undefined,
  serdeName: string,
) {
  return metadata?.[`${PREVIEW_METADATA_PREFIX}${serdeName}`] === 'true';
}

function getSerdePreviewRequest(options: RestateCodecOptions | undefined) {
  const service = options?.service?.value?.name;
  const commandType = options?.command?.type;

  if (!service || !commandType) {
    return undefined;
  }

  const serdeName = commandType.toLowerCase();
  const handler = options?.handler?.value?.name;
  const mergedMetadata = {
    ...options?.handler?.value?.metadata,
    ...options?.service?.value?.metadata,
  };

  let resolvedSerdeName: string | undefined;
  if (handler && isPreviewEnabled(mergedMetadata, `${handler}/${serdeName}`)) {
    resolvedSerdeName = `${handler}/${serdeName}`;
  } else if (isPreviewEnabled(mergedMetadata, serdeName)) {
    resolvedSerdeName = serdeName;
  }

  if (!resolvedSerdeName) {
    return undefined;
  }

  return {
    service,
    serdeName: resolvedSerdeName as SerdePreviewName,
    deployment: options?.deploymentId?.value,
  };
}

export function useSerdePreviewDecoder(baseUrl: string) {
  const queryClient = useQueryClient();

  return useMemo<RestateBinaryCodec>(
    () => async (value, options) => {
      const previewRequest = getSerdePreviewRequest(options);

      if (!previewRequest) {
        return value;
      }

      const data = await queryClient.ensureQueryData({
        ...getDecodeServiceSerdeQueryOptions(baseUrl, {
          service: previewRequest.service,
          serdeName: previewRequest.serdeName,
          body: value,
          deployment: previewRequest.deployment,
        }),
        staleTime: Infinity,
      });

      return utf8ToUint8Array(JSON.stringify(data) ?? '') ?? new Uint8Array();
    },
    [baseUrl, queryClient],
  );
}

export function useSerdePreviewEncoder(baseUrl: string) {
  const queryClient = useQueryClient();

  return useMemo<RestateBinaryCodec>(
    () => async (value, options) => {
      const previewRequest = getSerdePreviewRequest(options);

      if (!previewRequest) {
        return value;
      }

      return queryClient.ensureQueryData({
        ...getEncodeServiceSerdeQueryOptions(baseUrl, {
          service: previewRequest.service,
          serdeName: previewRequest.serdeName,
          body: value,
          deployment: previewRequest.deployment,
        }),
        staleTime: Infinity,
      });
    },
    [baseUrl, queryClient],
  );
}
