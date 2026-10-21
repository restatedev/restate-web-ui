import { SchemaRegistryProvider } from '@restate/data-access-admin-api';
import {
  type components,
  TERMINAL_INVOCATION_STATUSES,
} from '@restate/data-access-admin-api-spec';
import { InvocationActions } from '@restate/features-invocation-route';
import {
  getInvocationStatusIntent,
  InvocationId,
  InvocationStatusBadge,
  Status,
} from '@restate/features-invocation-ui';
import { useRestateContext } from '@restate/features-restate-context';
import {
  ServiceTarget,
  ServiceTargetProvider,
} from '@restate/features-service-target';
import { VirtualObjectLockHero } from '@restate/features-virtual-objects-route';
import { Badge } from '@restate/ui-badge';
import { Button } from '@restate/ui-button';
import {
  Card,
  CardGrid,
  CardHeader,
  CardLinkRow,
  CardRow,
} from '@restate/ui-card';
import {
  ContentPanel,
  ContentPanelBody,
  ContentPanelSection,
  ContentPanelToolbar,
} from '@restate/ui-content-panel';
import { ConfirmationDialog } from '@restate/ui-dialog';
import { EmptyState } from '@restate/ui-empty-state';
import { ErrorBanner } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';
import { ListPageHeader } from '@restate/ui-layout';
import { Link } from '@restate/ui-link';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui-table';
import {
  DateTooltip,
  HoverTooltip,
  TruncateWithTooltip,
} from '@restate/ui-tooltip';
import { formatDateTime, formatDurations } from '@restate/util-intl';
import {
  SnapshotTimeProvider,
  useDurationSinceLastSnapshot,
} from '@restate/util-snapshot-time';
import { tv } from '@restate/util-styles';
import { type FormEvent, useState } from 'react';
import { TenantServiceTarget } from '../TenantServiceTarget';
import {
  CRON_KEY,
  CRON_SERVICE,
  type CronRun,
  type CronSchedule,
} from './cronApi';
import { NewScheduleDialog } from './NewScheduleDialog';
import {
  useCronLock,
  useCronProject,
  useCronRunInvocations,
  useDeleteSchedule,
  useRefreshCrons,
} from './useCrons';

type InvocationV2 = components['schemas']['InvocationV2'];

type Column =
  | 'id'
  | 'target'
  | 'cron'
  | 'next_run'
  | 'created_at'
  | 'last_runs'
  | 'actions';

const columns: PanelTableColumn<Column>[] = [
  { id: 'id', name: 'Schedule', isRowHeader: true, defaultWidth: 150 },
  { id: 'target', name: 'Target', minWidth: 220 },
  { id: 'cron', name: 'Cron', minWidth: 180 },
  { id: 'next_run', name: 'Next run', defaultWidth: 120 },
  { id: 'created_at', name: 'Created', defaultWidth: 120 },
  { id: 'last_runs', name: 'Last runs', minWidth: 260 },
  { id: 'actions', name: 'Actions', width: 72, hideLabel: true },
];

const COMPLETED_STATUSES = new Set<string>(TERMINAL_INVOCATION_STATUSES);

const styles = tv({
  variants: {
    compact: {
      true: { runLink: 'flex h-5 w-4 items-center justify-center' },
    },
  },
  slots: {
    scheduleId:
      'block max-w-full min-w-0 truncate rounded-md border border-default bg-subtle/80 px-1.5 py-0.5 font-mono text-2xs text-subtle',
    expression: 'truncate font-mono text-xs text-tertiary',
    runs: 'flex min-w-0 items-center gap-1.5',
    runLink: 'shrink-0 rounded-full no-underline outline-offset-2',
    muted: 'text-xs text-subtle',
  },
});

const refreshIconStyles = tv({
  base: 'h-4 w-4',
  variants: { isRefreshing: { true: 'animate-spin' } },
});

export interface TenantCronsProps {
  scope: string;
}

export function TenantCrons({ scope }: TenantCronsProps) {
  const { schemaRegistryUrl } = useRestateContext();
  const content = <TenantCronsContent scope={scope} />;
  return (
    <ServiceTargetProvider component={TenantServiceTarget}>
      {schemaRegistryUrl ? (
        <SchemaRegistryProvider baseUrl={schemaRegistryUrl} scope={scope}>
          {content}
        </SchemaRegistryProvider>
      ) : (
        content
      )}
      <InvocationActions />
    </ServiceTargetProvider>
  );
}

function TenantCronsContent({ scope }: TenantCronsProps) {
  const { ingressMuxUrl } = useRestateContext();
  const [isNewScheduleOpen, setNewScheduleOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<CronSchedule>();
  const [scheduleToEdit, setScheduleToEdit] = useState<CronSchedule>();
  const project = useCronProject(scope);
  const runs = useCronRunInvocations(scope, project.data);
  const lock = useCronLock(scope);
  const refresh = useRefreshCrons(scope);

  if (!ingressMuxUrl) {
    return (
      <div className="px-5 py-20">
        <EmptyState
          icon={IconName.Timer}
          title="No ingress mux"
          description="This Restate server doesn’t advertise an ingress mux, so the tenant’s cron can’t be reached."
        />
      </div>
    );
  }

  const schedules = project.data?.schedules ?? [];
  const timer = project.data?.timer ?? undefined;
  const runningNow = schedules.flatMap((schedule) =>
    schedule.lastRuns.flatMap((run) => {
      const invocation = runs.invocations.get(run.invocationId);
      return invocation && !COMPLETED_STATUSES.has(invocation.status)
        ? [{ schedule, run, invocation }]
        : [];
    }),
  );
  const lockHolder = lock.data?.lockHolder;
  const listError = project.error ?? undefined;
  const s = styles();

  return (
    <SnapshotTimeProvider lastSnapshot={project.dataUpdatedAt}>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ListPageHeader icon={IconName.Timer} title="Crons">
          Schedules of{' '}
          <span className="font-mono">
            {CRON_SERVICE}/{CRON_KEY}
          </span>{' '}
          in <span className="font-mono">{scope}</span>, managed through the
          ingress mux.
        </ListPageHeader>
        {(lockHolder || timer || runningNow.length > 0) && (
          <CardGrid columns={3} className="relative z-40 mx-5 mb-4">
            {runningNow.length > 0 && <RunningNowCard runs={runningNow} />}
            {timer && (
              <WakeUpCard
                invocationId={timer.invocationId}
                wakeUpAt={timer.wakeUpAt}
              />
            )}
            <VirtualObjectLockHero lockHolder={lockHolder} />
          </CardGrid>
        )}
        <ContentPanel>
          <ContentPanelToolbar className="items-center gap-2 px-3 pb-1">
            <span className="mr-auto text-xs text-muted tabular-nums">
              {project.data &&
                `${schedules.length} ${schedules.length === 1 ? 'schedule' : 'schedules'}`}
            </span>
            <HoverTooltip content="Refresh crons">
              <Button
                variant="icon"
                aria-label="Refresh crons"
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
                disabled={project.isFetching}
                onClick={() => void refresh()}
              >
                <Icon
                  name={IconName.Retry}
                  className={refreshIconStyles({
                    isRefreshing: project.isFetching,
                  })}
                />
              </Button>
            </HoverTooltip>
            <Button
              variant="primary"
              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-0.5xs"
              onClick={() => setNewScheduleOpen(true)}
            >
              <Icon name={IconName.Plus} className="h-3.5 w-3.5" />
              New schedule
            </Button>
          </ContentPanelToolbar>
          <ContentPanelBody className="pb-8">
            {listError && (
              <ErrorBanner error={listError} className="mx-4 mt-4 rounded-xl" />
            )}
            <ContentPanelSection flush>
              <PanelTable
                aria-label="Cron schedules"
                columns={columns}
                items={schedules}
                isLoading={project.isPending}
                numOfRows={4}
                bodyDependencies={[
                  runs.invocations,
                  runs.isPending,
                  runs.error,
                ]}
                rowDependencies={[runs.invocations, runs.isPending, runs.error]}
                emptyPlaceholder={
                  <EmptyState
                    icon={IconName.Timer}
                    title={
                      listError ? 'Could not load schedules' : 'No schedules'
                    }
                    description={
                      listError
                        ? undefined
                        : 'Schedules created for this tenant will appear here.'
                    }
                  >
                    {!listError && (
                      <Button
                        variant="secondary"
                        onClick={() => setNewScheduleOpen(true)}
                      >
                        New schedule
                      </Button>
                    )}
                  </EmptyState>
                }
                renderCell={(schedule, column) => {
                  switch (column.id) {
                    case 'id':
                      return (
                        <Cell>
                          <TruncateWithTooltip
                            copyText={schedule.id}
                            tooltipContent={schedule.id}
                            alwaysShow
                            containerClassName="max-w-full min-w-0"
                          >
                            <code className={s.scheduleId()}>
                              {schedule.id}
                            </code>
                          </TruncateWithTooltip>
                        </Cell>
                      );
                    case 'target':
                      return (
                        <Cell>
                          <ServiceTarget
                            service={schedule.target.service}
                            handler={schedule.target.handler}
                            serviceType="service"
                            density="compact"
                            className="max-w-full min-w-0"
                          />
                        </Cell>
                      );
                    case 'cron':
                      return (
                        <Cell>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <code className={s.expression()}>
                              {schedule.cron.expression}
                            </code>
                            <Badge size="sm" className="shrink-0 py-0!">
                              {schedule.cron.timezone}
                            </Badge>
                          </div>
                        </Cell>
                      );
                    case 'next_run':
                      return (
                        <Cell>
                          <EpochTime
                            value={schedule.nextRunAt}
                            title="Next run"
                          />
                        </Cell>
                      );
                    case 'created_at':
                      return (
                        <Cell>
                          <div className="flex flex-col">
                            <EpochTime
                              value={schedule.createdAt}
                              title="Created"
                            />
                            {schedule.updatedAt !== undefined && (
                              <span className="text-2xs text-subtle">
                                updated{' '}
                                <EpochTime
                                  value={schedule.updatedAt}
                                  title="Updated"
                                />
                              </span>
                            )}
                          </div>
                        </Cell>
                      );
                    case 'last_runs':
                      return (
                        <Cell>
                          <LastRuns
                            runs={schedule.lastRuns}
                            invocations={runs.invocations}
                            isPending={runs.isPending}
                            isError={Boolean(runs.error)}
                          />
                        </Cell>
                      );
                    default:
                      return (
                        <Cell className="[&&&]:overflow-visible">
                          <div className="flex items-center gap-0.5">
                            <HoverTooltip content="Edit schedule">
                              <Button
                                variant="icon"
                                aria-label={`Edit schedule ${schedule.id}`}
                                className="flex h-6.5 w-6.5 items-center justify-center rounded-lg p-0 text-subtle hover:text-secondary"
                                onClick={() => setScheduleToEdit(schedule)}
                              >
                                <Icon
                                  name={IconName.Pencil}
                                  className="h-3.5 w-3.5"
                                />
                              </Button>
                            </HoverTooltip>
                            <HoverTooltip content="Delete schedule">
                              <Button
                                variant="icon"
                                aria-label={`Delete schedule ${schedule.id}`}
                                className="flex h-6.5 w-6.5 items-center justify-center rounded-lg p-0 text-subtle hover:text-danger"
                                onClick={() => setScheduleToDelete(schedule)}
                              >
                                <Icon
                                  name={IconName.Trash}
                                  className="h-3.5 w-3.5"
                                />
                              </Button>
                            </HoverTooltip>
                          </div>
                        </Cell>
                      );
                  }
                }}
              />
            </ContentPanelSection>
          </ContentPanelBody>
        </ContentPanel>
      </div>
      <NewScheduleDialog
        scope={scope}
        open={isNewScheduleOpen}
        onOpenChange={setNewScheduleOpen}
      />
      <NewScheduleDialog
        scope={scope}
        schedule={scheduleToEdit}
        open={Boolean(scheduleToEdit)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setScheduleToEdit(undefined);
          }
        }}
      />
      <DeleteScheduleDialog
        scope={scope}
        schedule={scheduleToDelete}
        onClose={() => setScheduleToDelete(undefined)}
      />
    </SnapshotTimeProvider>
  );
}

function EpochTime({ value, title }: { value: number; title: string }) {
  const durationSinceLastSnapshot = useDurationSinceLastSnapshot();
  const iso = new Date(value).toISOString();
  const { isPast, ...durationParts } = durationSinceLastSnapshot(iso);
  const duration = formatDurations(durationParts);
  return (
    <DateTooltip date={new Date(value)} title={title}>
      <time dateTime={iso} className="text-xs text-tertiary tabular-nums">
        {isPast ? `${duration} ago` : `in ${duration}`}
      </time>
    </DateTooltip>
  );
}

function LastRuns({
  runs,
  invocations,
  isPending,
  isError,
}: {
  runs: CronRun[];
  invocations: Map<string, InvocationV2>;
  isPending: boolean;
  isError: boolean;
}) {
  const s = styles();
  const [latest, ...older] = runs;
  if (!latest) {
    return <span className={s.muted()}>No runs yet</span>;
  }
  return (
    <div className={s.runs()}>
      <RunLink
        run={latest}
        invocation={invocations.get(latest.invocationId)}
        isPending={isPending}
        isError={isError}
      />
      {older.map((run) => (
        <RunLink
          key={run.runId}
          run={run}
          invocation={invocations.get(run.invocationId)}
          isPending={isPending}
          isError={isError}
          compact
        />
      ))}
    </div>
  );
}

const runDotStyles = tv({
  base: 'block h-2.5 w-2.5 rounded-full border border-surface',
  variants: {
    intent: {
      success: 'bg-success-vivid',
      danger: 'bg-danger-vivid',
      warning: 'bg-warning-vivid',
      info: 'bg-info-vivid',
      pending: 'bg-pending-vivid',
      default: 'bg-neutral',
      unknown: 'border-strong bg-transparent',
    },
  },
});

function RunLink({
  run,
  invocation,
  isPending,
  isError,
  compact = false,
}: {
  run: CronRun;
  invocation?: InvocationV2;
  isPending: boolean;
  isError: boolean;
  compact?: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const s = styles();
  const label = invocation
    ? invocation.status
    : isPending
      ? 'loading'
      : isError
        ? 'unknown'
        : 'not retained';
  return (
    <HoverTooltip
      content={
        <span className="flex flex-col">
          <span>
            Due {formatDateTime(new Date(run.at), 'system')} · {label}
          </span>
          <span className="font-mono">{run.invocationId}</span>
        </span>
      }
    >
      <Link
        href={`${baseUrl}/invocations/${encodeURIComponent(run.invocationId)}`}
        preserveQueryParams={false}
        variant="secondary"
        aria-label={`Open run ${run.invocationId}`}
        className={s.runLink({ compact })}
      >
        {compact ? (
          <span
            className={runDotStyles({
              intent: invocation
                ? getInvocationStatusIntent(invocation)
                : 'unknown',
            })}
          />
        ) : invocation ? (
          <InvocationStatusBadge
            status={invocation.status}
            isRetrying={Boolean(invocation.isRetrying)}
            mini
          />
        ) : isPending ? (
          <span className="block h-5 w-16 animate-pulse rounded-full bg-emphasis/70" />
        ) : (
          <Badge size="sm">{isError ? 'Unknown' : 'Not retained'}</Badge>
        )}
      </Link>
    </HoverTooltip>
  );
}

function RunningNowCard({
  runs,
}: {
  runs: { schedule: CronSchedule; run: CronRun; invocation: InvocationV2 }[];
}) {
  const { baseUrl } = useRestateContext();
  return (
    <Card intent="info">
      <CardHeader title="Running now" icon={IconName.Invocation} />
      {runs.map(({ schedule, run, invocation }) => (
        <CardLinkRow
          key={run.runId}
          href={`${baseUrl}/invocations/${encodeURIComponent(run.invocationId)}`}
          aria-label={`Open run ${run.invocationId}`}
          allowsInteractiveChildren
          className="flex-wrap gap-y-1"
          label={
            <InvocationId
              id={run.invocationId}
              popover={false}
              link={false}
              className="w-fit max-w-full min-w-0 text-xs font-normal"
            />
          }
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs text-muted">
              {schedule.target.service}/{schedule.target.handler}
            </span>
            <Status invocation={invocation} mini timeline={false} />
          </div>
        </CardLinkRow>
      ))}
    </Card>
  );
}

function WakeUpCard({
  invocationId,
  wakeUpAt,
}: {
  invocationId: string;
  wakeUpAt: number;
}) {
  const { baseUrl } = useRestateContext();
  return (
    <Card>
      <CardHeader title="Next wake-up" icon={IconName.Timer} />
      <CardRow variant="hero">
        <span className="text-sm text-tertiary">
          <EpochTime value={wakeUpAt} title="Wakes up at" />
        </span>
      </CardRow>
      <CardLinkRow
        href={`${baseUrl}/invocations/${encodeURIComponent(invocationId)}`}
        aria-label={`Open wake-up ${invocationId}`}
        label={
          <InvocationId
            id={invocationId}
            popover={false}
            link={false}
            className="w-fit max-w-full min-w-0 text-xs font-normal"
          />
        }
      />
    </Card>
  );
}

function DeleteScheduleDialog({
  scope,
  schedule,
  onClose,
}: {
  scope: string;
  schedule?: CronSchedule;
  onClose: VoidFunction;
}) {
  const remove = useDeleteSchedule(scope, { onSuccess: onClose });
  return (
    <ConfirmationDialog
      open={Boolean(schedule)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          remove.reset();
          onClose();
        }
      }}
      title="Delete schedule"
      icon={IconName.Trash}
      description={
        <p>
          Stop calling{' '}
          <span className="font-mono">
            {schedule?.target.service}/{schedule?.target.handler}
          </span>{' '}
          on <span className="font-mono">{schedule?.cron.expression}</span>.
          Runs already started keep running.
        </p>
      }
      submitText="Delete"
      submitVariant="destructive"
      isPending={remove.isPending}
      error={remove.error}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (schedule) {
          remove.mutate({ id: schedule.id });
        }
      }}
    />
  );
}
