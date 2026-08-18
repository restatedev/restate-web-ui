import { Card, CardHeader } from '@restate/ui/card';
import { IconName } from '@restate/ui/icons';
import { JourneyComparisonSummary } from './InvocationJourneyMilestones';
import type { InvocationJourneyModel } from './InvocationJourneyModel';
import { InvocationJourneyTimeline } from './InvocationJourneyTimeline';

export type {
  InvocationJourneyModel,
  JourneyActivityCounts,
  JourneyActivityDetail,
  JourneyActivityDetailGroup,
  JourneyActivityKind as ActivityKind,
  JourneyBlockedTime,
  JourneyCurrentStatus,
  JourneyInboxContext,
  JourneyJournalInvocation,
  JourneyPendingAttempt,
  JourneyQueueWait,
  JourneyStatusInvocation,
  JourneyTerminalStatus,
} from './InvocationJourneyModel';

export function InvocationJourneyCard({
  model,
}: {
  model: InvocationJourneyModel;
}) {
  return (
    <Card intent="none">
      <CardHeader title="Lifecycle" icon={IconName.History}>
        <JourneyComparisonSummary comparison={model.comparison} />
      </CardHeader>
      <InvocationJourneyTimeline scenario={model} />
    </Card>
  );
}
