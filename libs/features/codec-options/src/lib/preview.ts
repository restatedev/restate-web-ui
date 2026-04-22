import {
  getDecodeServiceSerdeQueryOptions,
  getEncodeServiceSerdeQueryOptions,
} from '@restate/data-access/admin-api';
import type { operations } from '@restate/data-access/admin-api-spec';
import type {
  RestateBinaryCodec,
  RestateCodecOptions,
} from '@restate/features/codec';
import { utf8ToUint8Array } from '@restate/util/binary';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

type SerdePreviewName =
  operations['decode_service_serde']['parameters']['path']['serdeName'];

function getSerdePreviewRequest(options: RestateCodecOptions | undefined) {
  const service = options?.service?.value?.name;
  const handler = options?.handler?.value?.name;
  const handlerMetadata = options?.handler?.value?.metadata;
  const serviceMetadata = options?.service?.value?.metadata;

  if (!service || (!handlerMetadata && !serviceMetadata)) {
    return undefined;
  }

  const commandType = options?.command?.type;

  if (!commandType) {
    return undefined;
  }

  const serdeName = commandType.toLowerCase();
  const isHandlerSerde = serdeName === 'input' || serdeName === 'output';

  if (isHandlerSerde && !handler) {
    return undefined;
  }

  const resolvedSerdeName =
    isHandlerSerde && handler ? `${handler}/${serdeName}` : serdeName;

  const previewMetadataKey = `restate.serde.preview.${resolvedSerdeName}`;

  if (
    handlerMetadata?.[previewMetadataKey] !== 'true' &&
    serviceMetadata?.[previewMetadataKey] !== 'true'
  ) {
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

      const data = await queryClient.ensureQueryData({
        ...getEncodeServiceSerdeQueryOptions(baseUrl, {
          service: previewRequest.service,
          serdeName: previewRequest.serdeName,
          body: value,
          deployment: previewRequest.deployment,
        }),
        staleTime: Infinity,
      });

      return new Uint8Array(data);
    },
    [baseUrl, queryClient],
  );
}
