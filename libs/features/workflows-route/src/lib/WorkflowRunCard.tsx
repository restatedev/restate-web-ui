import type { components } from '@restate/data-access/admin-api-spec';
import { useRestateContext } from '@restate/features/restate-context';
import {
  getInvocationStatusIntent,
  InvocationId,
  Status,
} from '@restate/features/invocation-ui';
import { LimitKey } from '@restate/features/vqueue-ui';
import { Card, CardHeader, CardLinkRow, CardRow } from '@restate/ui/card';
import { Icon, IconName } from '@restate/ui/icons';
import { RelativeDate } from '@restate/ui/tooltip';
import {
  formatDurations,
  normaliseDuration,
  parseISODuration,
} from '@restate/util/intl';

type Invocation = components['schemas']['InvocationV2'];
type WorkflowRunStatsResponse =
  components['schemas']['WorkflowRunStatsResponse'];

interface WorkflowRunCardProps {
  invocation: Invocation;
  stats?: WorkflowRunStatsResponse;
}

function formatDuration(value: string) {
  return formatDurations(normaliseDuration(parseISODuration(value)));
}

export function WorkflowRunUnavailableBanner() {
  return (
    <div
      role="status"
      className="relative z-40 mx-5 mt-3 flex min-h-12 items-center gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 shadow-xs"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
        <Icon name={IconName.ClockAlert} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-zinc-700">
          Run invocation not found
        </div>
        <div className="text-2xs text-zinc-500">
          It may have been removed after its retention period elapsed.
        </div>
      </div>
    </div>
  );
}

export function WorkflowRunCard({ invocation, stats }: WorkflowRunCardProps) {
  const { baseUrl } = useRestateContext();
  return (
    <Card intent={getInvocationStatusIntent(invocation)}>
      <CardHeader title="Execution" icon={IconName.Workflow} />
      <CardLinkRow
        variant="hero"
        href={`${baseUrl}/invocations/${invocation.id}`}
        aria-label={`Open invocation ${invocation.id}`}
        className="flex-wrap gap-y-1"
        label={
          <InvocationId
            id={invocation.id}
            truncateInMiddle
            popover={false}
            link={false}
            className="w-fit max-w-full min-w-0 text-sm font-normal [&_svg]:text-zinc-400"
          />
        }
      >
        <div className="min-w-0">
          <Status invocation={invocation} mini="md" timeline={false} />
        </div>
      </CardLinkRow>
      {/* TODO: Bring the VQueue ID row back when it is useful on Workflow run cards.
      {(invocation.vqueue?.vqueue_id ?? invocation.vqueue_id) && (
        <CardRow label="VQueue ID">
          <VQueueId
            id={invocation.vqueue?.vqueue_id ?? invocation.vqueue_id}
            size="md"
            truncateInMiddle
            className="ml-1 w-fit max-w-full min-w-0 [&_svg]:text-zinc-400"
          />
        </CardRow>
      )} */}
      {invocation.created_at && (
        <CardRow label="Created">
          <RelativeDate
            date={invocation.created_at}
            title="Run invocation created at"
          />
        </CardRow>
      )}
      {stats?.supported && stats.waitingToStartDuration && (
        <CardRow label="Waiting to start">
          <span className="text-xs text-zinc-600 tabular-nums">
            {formatDuration(stats.waitingToStartDuration)}
          </span>
        </CardRow>
      )}
      {invocation.limit_key && (
        <CardRow label="Limit key">
          <LimitKey value={invocation.limit_key} className="ml-1" />
        </CardRow>
      )}
    </Card>
  );
}
