import type { RestateCodecOptions } from '@restate/features/codec';
import { getAuthToken } from '@restate/util/api-config';
import { base64ToUint8Array, bytesToBase64 } from '@restate/util/binary';

export type RestateStringCodec = (
  value?: string,
  options?: RestateCodecOptions,
) => Promise<string> | string;

export type PlaygroundFetcher = typeof globalThis.fetch;

async function getEncodedPlaygroundBody(
  init: RequestInit | undefined,
  encoder: RestateStringCodec,
) {
  if (init?.body != null && typeof init.body !== 'string') {
    return init.body;
  }

  const encodedBody = await encoder(init?.body ?? '');
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

async function getDecodedPlaygroundResponse(
  response: Response,
  decoder: RestateStringCodec,
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
  const decodedBody = await decoder(encodedBody);

  return new Response(decodedBody, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function createPlaygroundFetcher(
  fetcher: PlaygroundFetcher,
  encoder: RestateStringCodec,
  decoder: RestateStringCodec,
): PlaygroundFetcher {
  return async (input, init) => {
    const request = new Request(input, init);
    const nextRequest = new Request(request, {
      credentials: 'include',
      ...(!['GET', 'HEAD'].includes(request.method.toUpperCase()) && {
        body: await getEncodedPlaygroundBody(init, encoder),
      }),
    });
    const token = getAuthToken();
    if (token && !nextRequest.headers.has('Authorization')) {
      nextRequest.headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetcher(nextRequest);
    return getDecodedPlaygroundResponse(response, decoder);
  };
}
