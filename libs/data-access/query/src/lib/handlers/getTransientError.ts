import { type QueryContext } from './shared';

interface TransientErrorEventJson {
  error_code: number;
  error_message: string;
  error_stacktrace: string;
  restate_doc_error_code: string;
  related_command_index: number;
  related_command_name: string;
  related_command_type: string;
}

interface JournalEventRow {
  id: string;
  appended_at: string;
  event_type: string;
  event_json: string;
}

export async function getTransientError(
  this: QueryContext,
  invocationId: string,
) {
  const { rows } = await this.query(
    `SELECT id, appended_at, event_type, event_json FROM sys_journal_events WHERE id = '${invocationId}' AND event_type = 'TransientError' ORDER BY appended_at DESC LIMIT 1`,
  );

  const transientEvent = rows[0] as JournalEventRow | undefined;

  if (!transientEvent) {
    return Response.json(null);
  }

  const eventData = JSON.parse(
    transientEvent.event_json,
  ) as TransientErrorEventJson;

  return new Response(
    JSON.stringify({
      message: eventData.error_message,
      stack: eventData.error_stacktrace,
      code: eventData.error_code,
      relatedCommandName: eventData.related_command_name,
      relatedCommandType: eventData.related_command_type,
      relatedRestateErrorCode: eventData.restate_doc_error_code,
      relatedCommandIndex: eventData.related_command_index,
      failedAt: transientEvent.appended_at,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
