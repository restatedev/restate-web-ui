import type { JournalEntryV2 } from '@restate/data-access/admin-api-spec';

export function EntryChain({
  entry,
}: {
  entry: Extract<JournalEntryV2, { category?: 'command' }>;
}) {
  switch (entry.type) {
    case 'Call':
    case 'OneWayCall':
      return (
        <>
          .{entry.handlerName}
          <span className="opacity-70">(…)</span>
        </>
      );
    case 'CompleteAwakeable':
      return (
        <>
          .resolve
          <span className="opacity-70">(…)</span>
        </>
      );

    default:
      return null;
  }
}
