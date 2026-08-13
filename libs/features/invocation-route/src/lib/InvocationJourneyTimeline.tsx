import { hasJourneyActivity } from './InvocationJourneyActivity';
import {
  JourneyAttemptActivitySummary,
  JourneyAttemptEndpoint,
  JourneyAttemptGroup,
} from './InvocationJourneyAttempts';
import {
  CurrentStateTail,
  JourneyContinuation,
  JourneyStart,
  PendingTail,
  PurgeEndpoint,
  TerminalEndpoint,
} from './InvocationJourneyMilestones';
import type { InvocationJourneyModel } from './InvocationJourneyModel';

export function InvocationJourneyTimeline({
  scenario,
}: {
  scenario: InvocationJourneyModel;
}) {
  const visibleActivity = hasJourneyActivity(
    scenario.activity,
    scenario.retryAttempts,
  );
  const latestAttemptStatus =
    scenario.currentAttemptActive && scenario.currentStatus === 'running'
      ? 'running'
      : undefined;
  const currentTransitionStatus =
    scenario.currentStatus === 'suspended' ||
    scenario.currentStatus === 'paused'
      ? scenario.currentStatus
      : undefined;
  const useAttemptGroup = scenario.attempts > 1;
  const activitySummary = visibleActivity ? (
    <JourneyAttemptActivitySummary scenario={scenario} />
  ) : undefined;

  if (scenario.attempts === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3">
        <JourneyStart
          scenario={scenario}
          liveQueueWait={!scenario.pendingAttempt}
          showQueueWait={!scenario.inboxState || !scenario.inbox}
        />
        <PendingTail
          pendingAttempt={scenario.pendingAttempt}
          inboxState={scenario.inboxState}
          currentStatus={scenario.currentStatus}
          currentStatusDuration={scenario.currentStatusDuration}
          inbox={scenario.inbox}
          scenario={scenario}
        />
        <JourneyContinuation active />
      </div>
    );
  }

  if (
    scenario.attempts === 1 &&
    !scenario.currentStatus &&
    !scenario.terminal &&
    !scenario.pendingAttempt &&
    !scenario.inboxState
  ) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3">
        <JourneyStart scenario={scenario} />
        <JourneyAttemptEndpoint number={1} label="Attempt" />
        <JourneyContinuation active={false} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-3">
      <JourneyStart scenario={scenario} />
      {useAttemptGroup ? (
        <JourneyAttemptGroup
          scenario={scenario}
          latestAttemptStatus={latestAttemptStatus}
          activitySummary={activitySummary}
        />
      ) : (
        <JourneyAttemptEndpoint
          number={1}
          label="Attempt"
          status={latestAttemptStatus}
          statusInvocation={scenario.currentStatusInvocation}
          duration={
            latestAttemptStatus
              ? scenario.currentStatusDuration
              : scenario.attemptsDuration
          }
          durationLabel={latestAttemptStatus ? 'Running for' : 'Lasted'}
          activitySummary={activitySummary}
        />
      )}
      {scenario.terminal && (
        <>
          <TerminalEndpoint
            {...scenario.terminal}
            connectionSource={useAttemptGroup ? 'attempt-group' : 'milestone'}
          />
          {scenario.purge && <PurgeEndpoint {...scenario.purge} />}
        </>
      )}
      {currentTransitionStatus && scenario.currentStatusInvocation && (
        <CurrentStateTail
          statusInvocation={scenario.currentStatusInvocation}
          duration={scenario.currentStatusDuration}
        />
      )}
      <PendingTail
        pendingAttempt={scenario.pendingAttempt}
        inboxState={scenario.inboxState}
        currentStatus={scenario.currentStatus}
        currentStatusDuration={scenario.currentStatusDuration}
        inbox={scenario.inbox}
        scenario={scenario}
      />
      {!scenario.terminal && <JourneyContinuation active />}
    </div>
  );
}
