import { type QueryContext } from './shared';

interface PausedEventJson {
  ty: 'Paused';
  last_failure: {
    error_code: number;
    error_message: string;
    error_stacktrace: string;
    restate_doc_error_code: string;
    related_command_index: number;
    related_command_name: string;
    related_command_type: string;
  };
}

interface JournalEventRow {
  id: string;
  appended_at: string;
  event_type: string;
  event_json: string;
}

export async function getPausedError(this: QueryContext, invocationId: string) {
  const { rows } = await this.query(
    `SELECT id, appended_at, event_type, event_json FROM sys_journal_events WHERE id = '${invocationId}' AND event_type = 'Paused' ORDER BY appended_at DESC LIMIT 1`,
  );

  const pausedEvent = rows[0] as JournalEventRow | undefined;

  if (!pausedEvent) {
    return new Response(
      JSON.stringify({
        message: 'No paused error found for this invocation.',
      }),
      {
        status: 404,
        statusText: 'Not found',
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const eventData = JSON.parse(pausedEvent.event_json) as PausedEventJson;
  const lastFailure = eventData.last_failure;

  return new Response(
    JSON.stringify({
      message: lastFailure.error_message,
      stack: lastFailure.error_stacktrace,
      code: lastFailure.error_code,
      relatedCommandName: lastFailure.related_command_name,
      relatedCommandType: lastFailure.related_command_type,
      relatedRestateErrorCode: lastFailure.restate_doc_error_code,
      relatedCommandIndex: lastFailure.related_command_index,
      pausedAt: pausedEvent.appended_at,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
