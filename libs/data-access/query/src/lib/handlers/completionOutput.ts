import type { JournalEntryPayloads } from '@restate/data-access-admin-api-spec';
import { bytesToBase64, hexToUint8Array } from '@restate/util-binary';
import { type QueryContext, quoteSqlString } from './shared.js';

type FailureJSON = {
  code?: number;
  message?: string;
  metadata?: Record<string, string>;
};

type CompletedInvocation = {
  id?: string;
  completion_result?: string;
  completion_failure?: string;
};

const CODE_ONLY_FAILURE = /^\[\d+\]$/;

function parseFailureJson(failureJSON?: string): FailureJSON {
  if (!failureJSON) {
    return {};
  }
  try {
    return JSON.parse(failureJSON);
  } catch {
    return {};
  }
}

export async function getCompletionOutput(
  context: QueryContext,
  invocationId: string,
): Promise<Pick<JournalEntryPayloads, 'value' | 'failure'>> {
  const statusQuery = await context.query(
    `SELECT completion_blob_id FROM sys_invocation_status WHERE id = ${quoteSqlString(invocationId)}`,
    'invocations/completion-blob-id',
  );
  const blobId = statusQuery.rows.at(0)?.completion_blob_id;
  if (typeof blobId !== 'string') {
    return {};
  }

  const outputQuery = await context.query(
    `SELECT result, output, failure_json FROM sys_blob_output WHERE id = ${quoteSqlString(blobId)}`,
    'invocations/output-blob',
  );
  const output = outputQuery.rows.at(0);
  if (output?.result === 'success') {
    return {
      value: output.output
        ? bytesToBase64(hexToUint8Array(output.output))
        : undefined,
    };
  }
  if (output?.result === 'failure') {
    const failure = parseFailureJson(output.failure_json);
    return {
      failure: {
        message: failure.message,
        restate_code: failure.code?.toString(),
        metadata: failure.metadata
          ? Object.entries(failure.metadata).map(([key, value]) => ({
              key,
              value,
            }))
          : undefined,
      },
    };
  }
  return {};
}

export async function withCompletionFailureMessage<
  T extends CompletedInvocation,
>(context: QueryContext, invocation: T | undefined): Promise<T | undefined> {
  if (
    !invocation?.id ||
    invocation.completion_result !== 'failure' ||
    !CODE_ONLY_FAILURE.test(invocation.completion_failure ?? '')
  ) {
    return invocation;
  }

  try {
    const { failure } = await getCompletionOutput(context, invocation.id);
    return failure?.message
      ? {
          ...invocation,
          completion_failure: `${invocation.completion_failure} ${failure.message}`,
        }
      : invocation;
  } catch {
    return invocation;
  }
}
