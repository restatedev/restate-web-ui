import { EmptyState } from '@restate/ui/empty-state';
import { Icon, IconName } from '@restate/ui/icons';
import { formatNumber } from '@restate/util/intl';

export function ResultsNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex min-h-9 w-full shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600"
    >
      <Icon
        name={IconName.Info}
        className="h-3.5 w-3.5 shrink-0 text-zinc-400"
      />
      <span>{message}</span>
    </div>
  );
}

export function getResultsNoticeMessage({
  countsDisagree,
  listIsSettled,
  isPartial,
  statusChangedCount,
}: {
  countsDisagree: boolean;
  listIsSettled: boolean;
  isPartial: boolean;
  statusChangedCount: number;
}) {
  const messages = [];
  if (countsDisagree) {
    messages.push(
      'Counts and results differ. Invocations may have changed between requests.',
    );
  }
  if (listIsSettled && isPartial) {
    messages.push('This view may not include every matching invocation.');
  }
  if (listIsSettled && statusChangedCount > 0) {
    messages.push(
      `${formatNumber(statusChangedCount)} ${statusChangedCount === 1 ? 'invocation changed' : 'invocations changed'} status while results were loading. The latest status is shown.`,
    );
  }
  return messages.join(' ');
}

export function CountsDisagreeEmptyState() {
  return (
    <EmptyState
      icon={IconName.TriangleAlert}
      intent="warning"
      title="Counts and results differ"
      description="No invocations were returned, but the counts indicate matching invocations. Invocations may have changed between requests."
    />
  );
}
