export type PlaygroundResult =
  | {
      kind: 'response';
      status: number;
      durationMs: number;
      contentType?: string;
      text?: string;
      bytes: Uint8Array;
      invocationId?: string;
      executionTime?: string;
    }
  | {
      kind: 'error';
      message: string;
      url: string;
      durationMs: number;
    };

const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });

function hasControlCharacters(text: string) {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 9 || (code > 13 && code < 32)) {
      return true;
    }
  }
  return false;
}

function decodeText(bytes: Uint8Array, contentType?: string) {
  if (bytes.length === 0) {
    return '';
  }
  const isTextual =
    !contentType || /json|text|xml|javascript|yaml|csv|html/i.test(contentType);
  try {
    const text = TEXT_DECODER.decode(bytes);
    return isTextual || !hasControlCharacters(text) ? text : undefined;
  } catch {
    return undefined;
  }
}

function acceptedFields(text?: string) {
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as {
      invocationId?: unknown;
      executionTime?: unknown;
    };
    return {
      invocationId:
        typeof parsed?.invocationId === 'string'
          ? parsed.invocationId
          : undefined,
      executionTime:
        typeof parsed?.executionTime === 'string'
          ? parsed.executionTime
          : undefined,
    };
  } catch {
    return {};
  }
}

export async function toPlaygroundResult(
  response: Response,
  durationMs: number,
): Promise<PlaygroundResult> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? undefined;
  const text = decodeText(bytes, contentType);
  const fields = response.status === 202 ? acceptedFields(text) : {};
  return {
    kind: 'response',
    status: response.status,
    durationMs,
    contentType,
    text,
    bytes,
    invocationId: response.headers.get('x-restate-id') ?? fields.invocationId,
    executionTime: fields.executionTime,
  };
}
