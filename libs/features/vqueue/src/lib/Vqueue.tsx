import { useGetVqueue } from '@restate/data-access/admin-api-hooks';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { EmptyState } from '@restate/ui/empty-state';
import { ErrorBanner } from '@restate/ui/error';
import { IconName } from '@restate/ui/icons';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
import { VqueueCard } from './VqueueCard';

// Rendered as the "Flow" tab. Internally everything stays in vqueue terms; the
// only "Flow" wording lives in the surrounding UI (tab label, empty states).
// `vqueueId` keys the whole snapshot; the optional `invocationId` highlights that
// invocation's own entry within the queue. Renders nothing without a `vqueueId`,
// or when the FEATURE_VQUEUE_OBSERVABILITY feature flag is off.
export function Vqueue({
  vqueueId,
  invocationId,
  enabled = true,
  showService = true,
  showStatus = true,
}: {
  vqueueId?: string;
  invocationId?: string;
  enabled?: boolean;
  showService?: boolean;
  showStatus?: boolean;
}) {
  const flagEnabled = useIsFeatureFlagEnabled('FEATURE_VQUEUE_OBSERVABILITY');
  const { data, isPending, error, dataUpdatedAt } = useGetVqueue(
    vqueueId,
    invocationId,
    {
      enabled: enabled && flagEnabled,
      // Live data — the queue moves. Poll while the tab is open.
      refetchInterval: 3_000,
      staleTime: 0,
      refetchOnMount: true,
    },
  );

  if (!flagEnabled || !enabled || !vqueueId) {
    return null;
  }

  if (isPending) {
    return <VqueueSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="w-full">
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
      <div className="w-full">
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
      <VqueueCard
        data={data}
        showService={showService}
        showStatus={showStatus}
      />
    </SnapshotTimeProvider>
  );
}

function VqueueSkeleton() {
  return (
    <div className="w-full">
      <div className="flex flex-col rounded-xl border bg-gray-200/50">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-32 animate-pulse rounded-md bg-slate-200" />
            <div className="h-5 w-24 animate-pulse rounded-md bg-slate-200/70" />
          </div>
          <div className="h-5 w-28 animate-pulse rounded-md bg-slate-200/70" />
        </div>
        <div className="rounded-[0.625rem] border border-white/50 bg-linear-to-b from-gray-50 to-gray-50/80 px-2 pt-7 pb-5 shadow-xs sm:px-4">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-3">
                <div className="flex h-7 items-end gap-[2px]">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-7 w-2 animate-pulse rounded-[3px] bg-slate-200/80"
                    />
                  ))}
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="mt-1 h-14 w-40 animate-pulse rounded-lg bg-slate-200/60" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="h-7 w-1.5 animate-pulse rounded bg-slate-200/70" />
                <div className="h-6 w-10 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 pt-3 pb-2">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
