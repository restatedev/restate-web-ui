import { Status } from '@restate/features-invocation-ui';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { formatOrdinals } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type { ReactNode } from 'react';
import { Disclosure, DisclosurePanel, Heading } from 'react-aria-components';
import {
  JourneyActivityRows,
  journeyCountLabel,
} from './InvocationJourneyActivity';
import { JourneyBlockedTimeSummary } from './InvocationJourneyBlockedTime';
import type {
  InvocationJourneyModel,
  JourneyBlockedTime,
  JourneyCurrentStatus,
  JourneyNodeTiming,
  JourneyStatusInvocation,
} from './InvocationJourneyModel';
import { JourneyNodeTime } from './InvocationJourneyTime';

export function JourneyAttemptEndpoint({
  number,
  label,
  status,
  statusInvocation,
  duration,
  durationLabel,
  blockedTime,
  activitySummary,
  timing,
}: {
  number: number;
  label?: string;
  status?: Extract<JourneyCurrentStatus, 'running'>;
  statusInvocation?: JourneyStatusInvocation;
  duration?: string;
  durationLabel?: 'Running for' | 'Lasted';
  blockedTime?: JourneyBlockedTime;
  activitySummary?: ReactNode;
  timing?: JourneyNodeTiming;
}) {
  return (
    <div className="relative z-10 flex min-h-8 min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full border border-strong bg-surface shadow-xs"
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-1 text-xs">
        <span className="font-medium text-secondary tabular-nums">
          {label ?? `${formatOrdinals(number)} attempt`}
        </span>
        {timing && <JourneyNodeTime timing={timing} />}
        {status && statusInvocation && (
          <Status invocation={statusInvocation} timeline={false} />
        )}
        {duration && durationLabel && (
          <span className="inline-flex shrink-0 items-baseline gap-1.5">
            <span className="text-subtle">{durationLabel}</span>
            <span className="font-medium text-tertiary tabular-nums">
              {duration}
            </span>
          </span>
        )}
        {blockedTime && (
          <JourneyBlockedTimeSummary
            value={blockedTime}
            context="latest-attempt"
          />
        )}
        {activitySummary}
      </div>
    </div>
  );
}

const attemptGroupStyles = tv({
  base: '-ml-2.5 min-w-0 overflow-hidden rounded-xl border border-default/80 bg-surface shadow-[0_1px_3px_--theme(--box-shadow-color-default/4%)]',
});

const attemptGroupHeaderStyles = tv({
  base: 'relative flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-muted py-2 text-xs',
  variants: {
    isCollapsible: {
      true: 'pr-8 pl-5.5',
      false: 'pr-2.5 pl-7.5',
    },
  },
});

const attemptGroupSummaryStyles = tv({
  base: 'relative z-10 flex min-w-0 flex-wrap items-baseline gap-1.5',
  variants: {
    isCollapsible: {
      true: 'pointer-events-none',
      false: '',
    },
  },
});

function AttemptGroupHeader({
  attemptLabel,
  attemptsDuration,
  isActive,
  isCollapsible,
  activitySummary,
}: {
  attemptLabel: string;
  attemptsDuration?: string;
  isActive: boolean;
  isCollapsible: boolean;
  activitySummary?: ReactNode;
}) {
  return (
    <div className={attemptGroupHeaderStyles({ isCollapsible })}>
      {isCollapsible && (
        <Heading className="absolute inset-0 z-0">
          <Button
            slot="trigger"
            variant="icon"
            aria-label={`Toggle ${attemptLabel}`}
            className="relative h-full w-full justify-end rounded-xl py-0 pr-2.5 pl-0 text-2xs hover:bg-subtle/70 pressed:bg-muted/70"
          >
            <Icon
              name={IconName.ChevronDown}
              className="h-3 w-3 shrink-0 text-muted transition-transform group-expanded:rotate-180"
            />
          </Button>
        </Heading>
      )}
      <div className={attemptGroupSummaryStyles({ isCollapsible })}>
        <span className="shrink-0 font-medium text-tertiary">
          {attemptLabel}
        </span>
        {attemptsDuration && (
          <>
            <span className="shrink-0 text-subtle">over</span>
            <span
              aria-label={`Attempts duration: ${attemptsDuration}${isActive ? ' so far' : ''}`}
              className="shrink-0 font-medium text-tertiary tabular-nums"
            >
              {attemptsDuration}
            </span>
            {isActive && <span className="shrink-0 text-subtle">so far</span>}
          </>
        )}
      </div>
      {activitySummary && (
        <>
          <span className="pointer-events-none relative z-10 text-subtle">
            with
          </span>
          <div className="relative z-10">{activitySummary}</div>
        </>
      )}
    </div>
  );
}

function AttemptGroupContent({
  scenario,
  latestAttemptStatus,
}: {
  scenario: InvocationJourneyModel;
  latestAttemptStatus?: Extract<JourneyCurrentStatus, 'running'>;
}) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <JourneyAttemptEndpoint
        number={1}
        label={scenario.attempts === 1 ? 'Attempt' : undefined}
        status={scenario.attempts === 1 ? latestAttemptStatus : undefined}
        statusInvocation={scenario.currentStatusInvocation}
        duration={
          scenario.attempts === 1 && latestAttemptStatus
            ? scenario.currentStatusDuration
            : undefined
        }
        durationLabel={
          scenario.attempts === 1 && latestAttemptStatus
            ? 'Running for'
            : undefined
        }
        timing={scenario.firstAttemptTiming}
      />
      {scenario.attempts > 1 && (
        <>
          <div className="relative ml-1.5 h-4 border-l border-default">
            {scenario.attempts > 2 && (
              <span
                aria-hidden="true"
                className="absolute top-1/2 -left-[0.2rem] z-10 -translate-y-1/2 bg-surface px-0.5 text-2xs leading-none text-faint"
              >
                ⋮
              </span>
            )}
          </div>
          <JourneyAttemptEndpoint
            number={scenario.attempts}
            status={latestAttemptStatus}
            statusInvocation={scenario.currentStatusInvocation}
            duration={
              latestAttemptStatus ? scenario.currentStatusDuration : undefined
            }
            durationLabel={latestAttemptStatus ? 'Running for' : undefined}
            blockedTime={scenario.latestAttemptBlockedTime}
            timing={scenario.latestAttemptTiming}
          />
        </>
      )}
    </div>
  );
}

export function JourneyAttemptGroup({
  scenario,
  latestAttemptStatus,
  activitySummary,
}: {
  scenario: InvocationJourneyModel;
  latestAttemptStatus?: Extract<JourneyCurrentStatus, 'running'>;
  activitySummary?: ReactNode;
}) {
  const attemptLabel = journeyCountLabel(
    scenario.attempts,
    'attempt',
    'attempts',
  );
  const isActive = latestAttemptStatus === 'running';
  const header = (
    <AttemptGroupHeader
      attemptLabel={attemptLabel}
      attemptsDuration={scenario.attemptsDuration}
      isActive={isActive}
      isCollapsible={!isActive}
      activitySummary={activitySummary}
    />
  );
  const content = (
    <AttemptGroupContent
      scenario={scenario}
      latestAttemptStatus={latestAttemptStatus}
    />
  );

  if (!isActive) {
    return (
      <div
        role="group"
        aria-label={attemptLabel}
        className={attemptGroupStyles()}
      >
        <Disclosure className="group">
          {header}
          <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip motion-safe:transition-[height]">
            {content}
          </DisclosurePanel>
        </Disclosure>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={attemptLabel}
      className={attemptGroupStyles()}
    >
      {header}
      {content}
    </div>
  );
}

export function JourneyAttemptActivitySummary({
  scenario,
}: {
  scenario: InvocationJourneyModel;
}) {
  return (
    <JourneyActivityRows
      activity={scenario.activity}
      details={scenario.activityDetails}
      retryAttempts={scenario.retryAttempts}
      currentAttemptActive={scenario.currentAttemptActive}
      inline
    />
  );
}
