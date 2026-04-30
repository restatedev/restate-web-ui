import { getAuthToken } from '@restate/util/api-config';
import { base64ToUint8Array, bytesToBase64 } from '@restate/util/binary';
import { RestateError } from '@restate/util/errors';
import type { RestateStringCodec } from './codecs';
import type { CodecFetcher } from './CodecRuntimeProvider';
import type { RestateCodecOptions } from './types';

export type { CodecFetcher } from './CodecRuntimeProvider';

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

function getMediaType(headers: Headers) {
  return headers.get('Content-Type')?.split(';').at(0)?.trim().toLowerCase();
}

function isRestateSendResponse(response: Response) {
  const restateId = response.headers.get('X-Restate-Id');

  return (
    response.url.endsWith('/send') &&
    getMediaType(response.headers) === 'application/json' &&
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

  if (getMediaType(headers) !== 'application/json') {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(decodedBody, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function toCodecErrorResponse(error: unknown, source?: Response) {
  const message = error instanceof Error ? error.message : String(error);
  const status =
    source?.status ??
    (error instanceof RestateError ? error.status : undefined);
  const statusText = source?.statusText;

  return new Response(message, {
    ...(status !== undefined && { status }),
    ...(statusText && { statusText }),
    headers: { 'Content-Type': 'text/plain' },
  });
}

export function createFetcherWithCodec(
  fetcher: CodecFetcher,
  encoder: RestateStringCodec,
  decoder: RestateStringCodec,
  getCodecOptions?: GetCodecOptions,
  onCall?: (req: Request) => void,
): CodecFetcher {
  return async (input, init) => {
    const request = new Request(input, init);
    const codecOptions = await getCodecOptions?.(request);
    const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase());

    let encodedBody: BodyInit | undefined;
    if (hasBody) {
      try {
        encodedBody = await getEncodedRequestBody(init, encoder, codecOptions);
      } catch (error) {
        return toCodecErrorResponse(error);
      }
    }

    const nextRequest = new Request(request, {
      credentials: 'include',
      ...(hasBody && { body: encodedBody }),
    });
    const token = getAuthToken();

    if (
      token &&
      (!nextRequest.headers.has('Authorization') ||
        nextRequest.headers.get('Authorization') === 'Bearer 123')
    ) {
      nextRequest.headers.set('Authorization', `Bearer ${token}`);
    }

    onCall?.(nextRequest);
    const response = await fetcher(nextRequest);

    try {
      return await getDecodedResponseBody(response, decoder, codecOptions);
    } catch (error) {
      return toCodecErrorResponse(error, response);
    }
  };
}
