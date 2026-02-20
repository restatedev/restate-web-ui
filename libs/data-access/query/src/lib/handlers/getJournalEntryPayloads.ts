import type {
  JournalEntryPayloads,
  JournalRawEntry,
} from '@restate/data-access/admin-api-spec';
import { bytesToBase64, hexToUint8Array } from '@restate/util/binary';
import type { QueryContext } from './shared';
import { fromBinary } from '@bufbuild/protobuf';
import { InputEntryMessageSchema } from '@buf/restatedev_service-protocol.bufbuild_es/dev/restate/service/protocol_pb';

type EntryType = JournalRawEntry['entry_type'];

type EntryJSON = {
  Command?: {
    Input?: {
      payload?: number[];
      headers?: Array<{ name?: string; value?: string }>;
    };
    Output?: {
      result?: {
        Success?: number[];
        Failure?: { message?: string; code?: number };
      };
    };
    Call?: {
      request?: {
        parameter?: number[];
        headers?: Array<{ name?: string; value?: string }>;
      };
    };
    OneWayCall?: {
      request?: {
        parameter?: number[];
        headers?: Array<{ name?: string; value?: string }>;
      };
    };
    SetState?: { value?: number[] };
    GetEagerState?: {
      result?: {
        Success?: number[];
        Failure?: { message?: string; code?: number };
      };
    };
    GetEagerStateKeys?: { state_keys?: string[] };
    CompleteAwakeable?: {
      result?: {
        Success?: number[];
        Failure?: { message?: string; code?: number };
      };
    };
    CompletePromise?: {
      value?: {
        Success?: number[];
        Failure?: { message?: string; code?: number };
      };
    };
  };
  Notification?: {
    Completion?: {
      Run?: {
        result?: {
          Success?: number[];
          Failure?: { message?: string; code?: number };
        };
      };
      Call?: {
        result?: {
          Success?: number[];
          Failure?: { message?: string; code?: number };
        };
      };
      GetPromise?: {
        result?: {
          Success?: number[];
          Failure?: { message?: string; code?: number };
        };
      };
      PeekPromise?: {
        result?: {
          Success?: number[];
          Failure?: { message?: string; code?: number };
        };
      };
      AttachInvocation?: {
        result?: {
          Success?: number[];
          Failure?: { message?: string; code?: number };
        };
      };
      GetLazyState?: {
        result?: {
          Success?: number[];
          Failure?: { message?: string; code?: number };
        };
      };
      GetLazyStateKeys?: {
        state_keys?: string[];
      };
    };
    Signal?: {
      result?: {
        Success?: number[];
        Failure?: { message?: string; code?: number };
      };
    };
  };
};

function parseEntryJson(entryJSON?: string): EntryJSON {
  if (!entryJSON) {
    return {};
  }
  try {
    return JSON.parse(entryJSON);
  } catch {
    return {};
  }
}

function decodeBinary(value?: number[]): string | undefined {
  if (Array.isArray(value) && value.length > 0) {
    return bytesToBase64(new Uint8Array(value));
  }
  return undefined;
}

function parseResult(result?: any): {
  value?: string;
  failure?: { message?: string; restate_code?: string };
} {
  if (result?.Success) {
    return { value: decodeBinary(result.Success) };
  }
  if (result?.Failure) {
    return {
      failure: {
        message: result.Failure.message,
        restate_code: result.Failure.code?.toString(),
      },
    };
  }
  return {};
}

function parseValue(valueObj?: any): {
  value?: string;
  failure?: { message?: string; restate_code?: string };
} {
  if (valueObj?.Success) {
    return { value: decodeBinary(valueObj.Success) };
  }
  if (valueObj?.Failure) {
    return {
      failure: {
        message: valueObj.Failure.message,
        restate_code: valueObj.Failure.code?.toString(),
      },
    };
  }
  return {};
}

function parseHeaders(
  headers?: Array<{ name?: string; value?: string }>,
): JournalEntryPayloads['headers'] {
  if (!Array.isArray(headers) || headers.length === 0) {
    return undefined;
  }
  return headers.map((h) => ({
    key: h.name ?? '',
    value: h.value ?? '',
  }));
}

function extractPayloads(
  entryType: EntryType,
  entryJSON: EntryJSON,
  raw?: string,
): JournalEntryPayloads | undefined {
  switch (entryType) {
    case 'Command: Input': {
      const input = entryJSON?.Command?.Input;
      return {
        parameters: decodeBinary(input?.payload),
        headers: parseHeaders(input?.headers),
      };
    }

    case 'Command: Output': {
      const output = entryJSON?.Command?.Output;
      const { value, failure } = parseResult(output?.result);
      return { value, failure };
    }

    case 'Command: Call': {
      const call = entryJSON?.Command?.Call;
      return {
        parameters: decodeBinary(call?.request?.parameter),
        headers: parseHeaders(call?.request?.headers),
      };
    }

    case 'Command: OneWayCall': {
      const call = entryJSON?.Command?.OneWayCall;
      return {
        parameters: decodeBinary(call?.request?.parameter),
        headers: parseHeaders(call?.request?.headers),
      };
    }

    case 'Command: SetState': {
      const setState = entryJSON?.Command?.SetState;
      return { value: decodeBinary(setState?.value) };
    }

    case 'Command: GetEagerState': {
      const getState = entryJSON?.Command?.GetEagerState;
      const { value, failure } = parseResult(getState?.result);
      return { value, failure };
    }

    case 'Command: GetEagerStateKeys': {
      const getStateKeys = entryJSON?.Command?.GetEagerStateKeys;
      return { keys: getStateKeys?.state_keys };
    }

    case 'Command: CompleteAwakeable': {
      const complete = entryJSON?.Command?.CompleteAwakeable;
      const { value, failure } = parseResult(complete?.result);
      return { value, failure };
    }

    case 'Command: CompletePromise': {
      const complete = entryJSON?.Command?.CompletePromise;
      const { value, failure } = parseValue(complete?.value);
      return { value, failure };
    }

    // V2 Notifications WITH payloads
    case 'Notification: Run': {
      const run = entryJSON?.Notification?.Completion?.Run;
      const { value, failure } = parseResult(run?.result);
      return { value, failure };
    }

    case 'Notification: Call': {
      const call = entryJSON?.Notification?.Completion?.Call;
      const { value, failure } = parseResult(call?.result);
      return { value, failure };
    }

    case 'Notification: Signal': {
      const signal = entryJSON?.Notification?.Signal;
      const { value, failure } = parseResult(signal?.result);
      return { value, failure };
    }

    case 'Notification: GetPromise': {
      const getPromise = entryJSON?.Notification?.Completion?.GetPromise;
      const { value, failure } = parseResult(getPromise?.result);
      return { value, failure };
    }

    case 'Notification: PeekPromise': {
      const peekPromise = entryJSON?.Notification?.Completion?.PeekPromise;
      const { value, failure } = parseResult(peekPromise?.result);
      return { value, failure };
    }

    case 'Notification: AttachInvocation': {
      const attach = entryJSON?.Notification?.Completion?.AttachInvocation;
      const { value, failure } = parseResult(attach?.result);
      return { value, failure };
    }

    case 'Notification: GetLazyState': {
      const getLazyState = entryJSON?.Notification?.Completion?.GetLazyState;
      const { value, failure } = parseResult(getLazyState?.result);
      return { value, failure };
    }

    case 'Notification: GetLazyStateKeys': {
      const getLazyStateKeys =
        entryJSON?.Notification?.Completion?.GetLazyStateKeys;
      return { keys: getLazyStateKeys?.state_keys };
    }

    // V2 Commands WITHOUT payloads
    case 'Command: Run':
    case 'Command: Sleep':
    case 'Command: GetPromise':
    case 'Command: PeekPromise':
    case 'Command: AttachInvocation':
    case 'Command: GetInvocationOutput':
    case 'Command: ClearState':
    case 'Command: ClearAllState':
    case 'Command: Awakeable':
    case 'Command: GetState':
    case 'Command: GetStateKeys':
    case 'Command: GetLazyState':
    case 'Command: GetLazyStateKeys':
    case 'Command: Custom':
    case 'Command: SendSignal':
      return undefined;

    // V2 Notifications WITHOUT payloads
    case 'Notification: Sleep':
    case 'Notification: CallInvocationId':
    case 'Notification: CompletePromise':
      return undefined;

    // V2 Events (no payloads)
    case 'Event: TransientError':
    case 'Event: Paused':
    case 'Event':
      return undefined;

    // V1 entry types (not supported for payload extraction)
    case 'Input': {
      const message = raw
        ? fromBinary(InputEntryMessageSchema, hexToUint8Array(raw))
        : undefined;
      if (message) {
        return {
          parameters: bytesToBase64(message.value),
          headers: message.headers.map(({ key, value }) => ({ key, value })),
        };
      }
      return {};
    }
    case 'Output':
    case 'GetState':
    case 'GetEagerState':
    case 'SetState':
    case 'GetStateKeys':
    case 'GetEagerStateKeys':
    case 'ClearState':
    case 'ClearAllState':
    case 'Sleep':
    case 'GetPromise':
    case 'PeekPromise':
    case 'CompletePromise':
    case 'OneWayCall':
    case 'Call':
    case 'Awakeable':
    case 'CompleteAwakeable':
    case 'Run':
    case 'CancelInvocation':
    case 'GetCallInvocationId':
    case 'AttachInvocation':
    case 'GetInvocationOutput':
    case 'Custom':
    case 'Paused':
      return undefined;
  }
}

export async function getJournalEntryPayloads(
  this: QueryContext,
  invocationId: string,
  entryIndex: number,
): Promise<Response> {
  const journalQuery = await this.query(
    `SELECT entry_type, entry_json, raw FROM sys_journal WHERE id = '${invocationId}' AND index = ${entryIndex}`,
  );

  const entry = journalQuery.rows?.at(0);

  if (!entry) {
    return new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not found',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entryJSON = parseEntryJson(entry.entry_json);
  const payloads = extractPayloads(
    entry.entry_type as EntryType,
    entryJSON,
    entry.raw,
  );

  if (payloads === undefined) {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(payloads), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
