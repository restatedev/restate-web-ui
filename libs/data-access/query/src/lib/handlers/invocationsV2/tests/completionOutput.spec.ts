import { describe, expect, it } from 'vitest';
import {
  createInvocationV2QueryTestHarness,
  rawInvocation,
} from './testUtils.js';

const END_MARKER_ENTRY = {
  id: 'inv-a',
  index: 1,
  appended_at: '2026-01-01T00:00:02.000Z',
  entry_type: 'Command: EndMarker',
  name: 'greeting',
  raw_length: 12,
  version: 2,
  entry_lite_json: JSON.stringify({ Command: { EndMarker: {} } }),
};

const BLOB_ID = 'blob_1abc';

function readsBlobTable(sql: string[]) {
  return sql.some(
    (statement) =>
      statement.includes('sys_blob_output') ||
      statement.includes('completion_blob_id'),
  );
}

describe('invocation results stored in the blob table', () => {
  const { sql, get, setResponder } = createInvocationV2QueryTestHarness();

  it('shows the EndMarker as the Output entry without loading the blob', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_invocation WHERE')) {
        return [
          rawInvocation('inv-a', {
            status: 'completed',
            completion_result: 'success',
          }),
        ];
      }
      if (statement.includes('FROM sys_journal WHERE')) {
        return [END_MARKER_ENTRY];
      }
      return [];
    });

    const response = await get('/v2/invocations/inv-a');
    const body = await response.json();

    expect(body.status).toBe('succeeded');
    expect(
      body.journal.entries.find(
        (entry: { index?: number }) => entry.index === 1,
      ),
    ).toMatchObject({
      type: 'Output',
      category: 'command',
      name: 'greeting',
      resultType: 'success',
      isLoaded: false,
    });
    expect(
      body.journal.entries.find(
        (entry: { index?: number }) => entry.index === 1,
      ),
    ).not.toHaveProperty('size');
    expect(readsBlobTable(sql)).toBe(false);
  });

  it('loads the EndMarker payload from sys_blob_output', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_journal WHERE')) {
        return [{ entry_type: 'Command: EndMarker', entry_json: '{}' }];
      }
      if (statement.includes('FROM sys_invocation_status WHERE')) {
        return [{ completion_blob_id: BLOB_ID }];
      }
      if (statement.includes('FROM sys_blob_output WHERE')) {
        return [{ result: 'success', output: '22686922' }];
      }
      return [];
    });

    const response = await get('/invocations/inv-a/journal/1/payloads');

    expect(sql).toEqual([
      "SELECT entry_type, entry_json, raw FROM sys_journal WHERE id = 'inv-a' AND index = 1",
      "SELECT completion_blob_id FROM sys_invocation_status WHERE id = 'inv-a'",
      `SELECT result, output, failure_json FROM sys_blob_output WHERE id = '${BLOB_ID}'`,
    ]);
    expect(await response.json()).toEqual({ value: 'ImhpIg==' });
  });

  it('returns the stored failure of an EndMarker', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_journal WHERE')) {
        return [{ entry_type: 'Command: EndMarker' }];
      }
      if (statement.includes('FROM sys_invocation_status WHERE')) {
        return [{ completion_blob_id: BLOB_ID }];
      }
      if (statement.includes('FROM sys_blob_output WHERE')) {
        return [
          {
            result: 'failure',
            failure_json: JSON.stringify({
              code: 500,
              message: 'boom',
              metadata: { attempt: '3' },
            }),
          },
        ];
      }
      return [];
    });

    const response = await get('/invocations/inv-a/journal/1/payloads');

    expect(await response.json()).toEqual({
      failure: {
        message: 'boom',
        restate_code: '500',
        metadata: [{ key: 'attempt', value: '3' }],
      },
    });
  });

  it('restores the failure message the status no longer carries', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_invocation WHERE')) {
        return [
          rawInvocation('inv-a', {
            status: 'completed',
            completion_result: 'failure',
            completion_failure: '[500]',
          }),
        ];
      }
      if (statement.includes('FROM sys_invocation_status WHERE')) {
        return [{ completion_blob_id: BLOB_ID }];
      }
      if (statement.includes('FROM sys_blob_output WHERE')) {
        return [
          {
            result: 'failure',
            failure_json: JSON.stringify({ code: 500, message: 'boom' }),
          },
        ];
      }
      return [];
    });

    const response = await get('/invocations/inv-a');

    expect(sql.slice(-2)).toEqual([
      "SELECT completion_blob_id FROM sys_invocation_status WHERE id = 'inv-a'",
      `SELECT result, output, failure_json FROM sys_blob_output WHERE id = '${BLOB_ID}'`,
    ]);
    expect(await response.json()).toMatchObject({
      status: 'failed',
      completion_failure: '[500] boom',
    });
  });

  it('classifies the status from the code before restoring the message', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_invocation WHERE')) {
        return [
          rawInvocation('inv-a', {
            status: 'completed',
            completion_result: 'failure',
            completion_failure: '[409]',
          }),
        ];
      }
      if (statement.includes('FROM sys_invocation_status WHERE')) {
        return [{ completion_blob_id: BLOB_ID }];
      }
      if (statement.includes('FROM sys_blob_output WHERE')) {
        return [
          {
            result: 'failure',
            failure_json: JSON.stringify({ code: 409, message: 'Conflict' }),
          },
        ];
      }
      return [];
    });

    const response = await get('/v2/invocations/inv-a');

    expect(await response.json()).toMatchObject({
      status: 'cancelled',
      completion_failure: '[409] Conflict',
    });
  });

  it('keeps the code-only failure when the blob lookup fails', async () => {
    setResponder((statement) => {
      if (statement.includes('FROM sys_invocation WHERE')) {
        return [
          rawInvocation('inv-a', {
            status: 'completed',
            completion_result: 'failure',
            completion_failure: '[409]',
          }),
        ];
      }
      if (statement.includes('FROM sys_invocation_status WHERE')) {
        throw new Error('unavailable');
      }
      return [];
    });

    const response = await get('/v2/invocations/inv-a');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'cancelled',
      completion_failure: '[409]',
    });
  });

  it.each([
    { completion_result: 'success' },
    { completion_result: 'failure', completion_failure: '[500] boom' },
    { completion_result: 'failure', completion_failure: '[409] killed' },
  ])(
    'never reads the blob table for results stored the old way (%o)',
    async (completion) => {
      setResponder((statement) => {
        if (statement.includes('FROM sys_invocation WHERE')) {
          return [
            rawInvocation('inv-a', { status: 'completed', ...completion }),
          ];
        }
        return [];
      });

      await get('/invocations/inv-a');
      await get('/v2/invocations/inv-a');

      expect(readsBlobTable(sql)).toBe(false);
    },
  );
});
