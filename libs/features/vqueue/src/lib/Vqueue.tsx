import { useGetVqueue } from '@restate/data-access/admin-api-hooks';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { IconName } from '@restate/ui/icons';
import { VqueueCard } from './VqueueCard';

// Rendered as the "Flow" tab. Internally everything stays in vqueue terms; the
// only "Flow" wording lives in the surrounding UI (tab label, empty states).
// `vqueueId` keys the whole snapshot; the optional `invocationId` highlights that
// invocation's own entry within the queue. Renders nothing without a `vqueueId`.
export function Vqueue({
  vqueueId,
  invocationId,
  enabled = true,
}: {
  vqueueId?: string;
  invocationId?: string;
  enabled?: boolean;
}) {
  const { data, isPending, error, dataUpdatedAt } = useGetVqueue(
    vqueueId,
    invocationId,
    {
      enabled,
      // Live data — the queue moves. Poll while the tab is open.
      refetchInterval: 3_000,
      staleTime: 0,
      refetchOnMount: true,
    },
  );

  if (!enabled || !vqueueId) {
    return null;
  }

  if (isPending) {
    return <VqueueSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <EmptyState
          icon={IconName.TriangleAlert}
          intent="danger"
          title="Couldn’t load flow"
        >
          <ErrorBanner error={error} className="w-full rounded-xl text-left" />
        </EmptyState>
      </div>
    );
  }

  if (!data || data.supported === false) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <EmptyState
          icon={IconName.ScanSearch}
          intent="neutral"
          title="No flow for this invocation"
          description="This invocation isn’t backed by a virtual queue, or this server doesn’t expose queue scheduling details."
        />
      </div>
    );
  }

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <VqueueCard data={data} />
    </SnapshotTimeProvider>
  );
}

function VqueueSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200" />
          <div className="h-6 w-32 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="my-5 flex justify-center">
          <div className="h-28 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="flex items-end gap-3">
          <div className="h-8 flex-1 animate-pulse rounded-md bg-slate-200" />
          <div className="h-10 w-10 animate-pulse rounded-[11px] bg-slate-200" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-slate-200" />
          <div className="h-12 w-20 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="mt-6 h-4 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
