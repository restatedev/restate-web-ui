import type { RestateCodecOptions } from '@restate/features/codec';
import { getAuthToken } from '@restate/util/api-config';
import { base64ToUint8Array, bytesToBase64 } from '@restate/util/binary';
import type { RestateStringCodec } from './codecs';

export type CodecFetcher = typeof globalThis.fetch;

export type GetCodecOptions = (
  request: Request,
) => RestateCodecOptions | Promise<RestateCodecOptions | undefined> | undefined;

function withCodecCommandType(
  codecOptions: RestateCodecOptions | undefined,
  type: 'Input' | 'Output',
) {
  return codecOptions
    ? {
        ...codecOptions,
        command: {
          ...codecOptions.command,
          type,
        },
      }
    : undefined;
}

async function getEncodedRequestBody(
  init: RequestInit | undefined,
  encoder: RestateStringCodec,
  codecOptions?: RestateCodecOptions,
) {
  if (init?.body != null && typeof init.body !== 'string') {
    return init.body;
  }

  const encodedBody = await encoder(
    init?.body ?? '',
    withCodecCommandType(codecOptions, 'Input'),
  );
  return base64ToUint8Array(encodedBody);
}

function isRestateSendResponse(response: Response) {
  const contentType = response.headers
    .get('Content-Type')
    ?.split(';')
    .at(0)
    ?.trim()
    .toLowerCase();
  const restateId = response.headers.get('X-Restate-Id');

  return (
    response.url.endsWith('/send') &&
    contentType === 'application/json' &&
    restateId?.startsWith('inv_') === true
  );
}

async function getDecodedResponseBody(
  response: Response,
  decoder: RestateStringCodec,
  codecOptions?: RestateCodecOptions,
) {
  if (
    !response.ok ||
    [204, 205, 304].includes(response.status) ||
    isRestateSendResponse(response)
  ) {
    return response;
  }

  const encodedBody = bytesToBase64(
    new Uint8Array(await response.clone().arrayBuffer()),
  );
  const decodedBody = await decoder(
    encodedBody,
    withCodecCommandType(codecOptions, 'Output'),
  );
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/json');

  return new Response(decodedBody, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function createFetcherWithCodec(
  fetcher: CodecFetcher,
  encoder: RestateStringCodec,
  decoder: RestateStringCodec,
  getCodecOptions?: GetCodecOptions,
): CodecFetcher {
  return async (input, init) => {
    const request = new Request(input, init);
    const codecOptions = await getCodecOptions?.(request);
    const nextRequest = new Request(request, {
      credentials: 'include',
      ...(!['GET', 'HEAD'].includes(request.method.toUpperCase()) && {
        body: await getEncodedRequestBody(init, encoder, codecOptions),
      }),
    });
    const token = getAuthToken();

    if (
      token &&
      (!nextRequest.headers.has('Authorization') ||
        nextRequest.headers.get('Authorization') === 'Bearer 123')
    ) {
      nextRequest.headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetcher(nextRequest);
    return getDecodedResponseBody(response, decoder, codecOptions);
  };
}
