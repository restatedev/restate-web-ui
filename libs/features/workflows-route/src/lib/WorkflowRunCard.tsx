import type { components } from '@restate/data-access/admin-api-spec';
import { Actions } from '@restate/features/invocation-route';
import {
  getInvocationStatusIntent,
  InvocationId,
  Status,
} from '@restate/features/invocation-ui';
import { LimitKey, VQueueId } from '@restate/features/vqueue-ui';
import { Card, CardHeader, CardRow } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';

type Invocation = components['schemas']['InvocationV2'];

export function WorkflowRunCard({ invocation }: { invocation?: Invocation }) {
  if (!invocation) return null;

  const vqueueId = invocation.vqueue?.vqueue_id ?? invocation.vqueue_id;

  return (
    <Card intent={getInvocationStatusIntent(invocation)}>
      <CardHeader
        title="Workflow run"
        icon={IconName.Workflow}
        action={<Actions invocation={invocation} mini={false} />}
      />
      <CardRow variant="hero" className="flex-wrap gap-y-1">
        <InvocationId
          id={invocation.id}
          truncateInMiddle
          popover={false}
          className="w-fit max-w-full min-w-0 text-sm [&_svg]:text-zinc-400"
        />
        <span className="min-w-2 flex-auto" />
        <div className="min-w-0">
          <Status invocation={invocation} mini="md" timeline={false} />
        </div>
      </CardRow>
      {vqueueId && (
        <CardRow>
          <VQueueId
            id={vqueueId}
            size="md"
            truncateInMiddle
            className="w-fit max-w-full min-w-0 [&_svg]:text-zinc-400"
          />
        </CardRow>
      )}
      {invocation.limit_key && (
        <CardRow>
          <LimitKey value={invocation.limit_key} variant="row" />
        </CardRow>
      )}
    </Card>
  );
}
