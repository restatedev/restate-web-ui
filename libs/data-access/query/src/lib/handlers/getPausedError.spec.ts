import { describe, expect, it } from 'vitest';
import { createInvocationV2QueryTestHarness } from './invocationsV2/tests/testUtils.js';

function pausedEvent(eventJson: Record<string, unknown>) {
  return {
    id: 'inv_1paused',
    appended_at: '2026-11-25T15:42:16.165Z',
    event_type: 'Paused',
    event_json: JSON.stringify(eventJson),
  };
}

describe('GET /query/invocations/:invocationId/paused-error', () => {
  const { get, setResponder } = createInvocationV2QueryTestHarness();

  it('returns the failure the invocation was paused after', async () => {
    setResponder(() => [
      pausedEvent({
        ty: 'Paused',
        last_failure: {
          error_code: 500,
          error_message: 'config missing',
          error_stacktrace: 'Error: config missing',
          restate_doc_error_code: 'RT0007',
          related_command_index: 1,
          related_command_name: 'load settings',
          related_command_type: 'Run',
        },
      }),
    ]);

    const response = await get('/invocations/inv_1paused/paused-error');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'config missing',
      stack: 'Error: config missing',
      code: 500,
      relatedCommandName: 'load settings',
      relatedCommandType: 'Run',
      relatedRestateErrorCode: 'RT0007',
      relatedCommandIndex: 1,
      pausedAt: '2026-11-25T15:42:16.165Z',
    });
  });

  it('returns only the pause time for a manual pause', async () => {
    setResponder(() => [pausedEvent({ ty: 'Paused' })]);

    const response = await get('/invocations/inv_1paused/paused-error');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      pausedAt: '2026-11-25T15:42:16.165Z',
    });
  });
});
