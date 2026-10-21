import { SchemaRegistryProvider } from '@restate/data-access-admin-api';
import {
  type components,
  TERMINAL_INVOCATION_STATUSES,
} from '@restate/data-access-admin-api-spec';
import { InvocationActions } from '@restate/features-invocation-route';
import {
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
import { isUnauthorizedError } from '@restate/util-errors';
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
  useMuxToken,
} from './cronApi';
import { MuxTokenDialog } from './MuxTokenDialog';
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
  { id: 'actions', name: 'Actions', width: 40, hideLabel: true },
];

const COMPLETED_STATUSES = new Set<string>(TERMINAL_INVOCATION_STATUSES);

const styles = tv({
  slots: {
    scheduleId:
      'block max-w-full min-w-0 truncate rounded-md border border-default bg-subtle/80 px-1.5 py-0.5 font-mono text-2xs text-subtle',
    expression: 'truncate font-mono text-xs text-tertiary',
    runs: 'flex min-w-0 items-center gap-1 overflow-hidden',
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
  const { token, isRejected } = useMuxToken();
  const [isTokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [isTokenDialogDismissed, setTokenDialogDismissed] = useState(false);
  const [isNewScheduleOpen, setNewScheduleOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<CronSchedule>();
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
  const openTokenDialog = () => {
    setTokenDialogDismissed(false);
    setTokenDialogOpen(true);
  };
  const isTokenMissing = !token;
  const listError =
    project.error && !isUnauthorizedError(project.error)
      ? project.error
      : undefined;
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
            <HoverTooltip content="Ingress mux token">
              <Button
                variant="icon"
                aria-label="Ingress mux token"
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
                onClick={openTokenDialog}
              >
                <Icon name={IconName.ApiKey} className="h-4 w-4" />
              </Button>
            </HoverTooltip>
            <HoverTooltip content="Refresh crons">
              <Button
                variant="icon"
                aria-label="Refresh crons"
                className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg p-0"
                disabled={isTokenMissing || project.isFetching}
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
              onClick={() =>
                isTokenMissing ? openTokenDialog() : setNewScheduleOpen(true)
              }
            >
              <Icon name={IconName.Plus} className="h-3.5 w-3.5" />
              New schedule
            </Button>
          </ContentPanelToolbar>
          <ContentPanelBody className="pb-8">
            {(listError || runs.error) && (
              <ErrorBanner
                error={listError ?? runs.error}
                className="mx-4 mt-4 rounded-xl"
              />
            )}
            <ContentPanelSection flush>
              <PanelTable
                aria-label="Cron schedules"
                columns={columns}
                items={schedules}
                isLoading={!isTokenMissing && project.isPending}
                numOfRows={4}
                emptyPlaceholder={
                  isTokenMissing ? (
                    <EmptyState
                      icon={IconName.ApiKey}
                      title="Ingress mux token needed"
                      description="The tenant’s cron is reached through the ingress mux with the operator token."
                    >
                      <Button variant="secondary" onClick={openTokenDialog}>
                        Set token
                      </Button>
                    </EmptyState>
                  ) : (
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
                  )
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
                          <EpochTime
                            value={schedule.createdAt}
                            title="Created"
                          />
                        </Cell>
                      );
                    case 'last_runs':
                      return (
                        <Cell>
                          <LastRuns
                            runs={schedule.lastRuns}
                            invocations={runs.invocations}
                            isPending={runs.isPending}
                          />
                        </Cell>
                      );
                    default:
                      return (
                        <Cell className="[&&&]:overflow-visible">
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
                        </Cell>
                      );
                  }
                }}
              />
            </ContentPanelSection>
          </ContentPanelBody>
        </ContentPanel>
      </div>
      <MuxTokenDialog
        open={isTokenDialogOpen || (isTokenMissing && !isTokenDialogDismissed)}
        isRejected={isRejected}
        onOpenChange={(isOpen) => {
          setTokenDialogOpen(isOpen);
          if (!isOpen) {
            setTokenDialogDismissed(true);
          }
        }}
      />
      <NewScheduleDialog
        scope={scope}
        open={isNewScheduleOpen && !isTokenMissing}
        onOpenChange={setNewScheduleOpen}
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
}: {
  runs: CronRun[];
  invocations: Map<string, InvocationV2>;
  isPending: boolean;
}) {
  const s = styles();
  if (runs.length === 0) {
    return <span className={s.muted()}>No runs yet</span>;
  }
  return (
    <div className={s.runs()}>
      {runs.map((run) => (
        <RunLink
          key={run.runId}
          run={run}
          invocation={invocations.get(run.invocationId)}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

function RunLink({
  run,
  invocation,
  isPending,
}: {
  run: CronRun;
  invocation?: InvocationV2;
  isPending: boolean;
}) {
  const { baseUrl } = useRestateContext();
  const s = styles();
  return (
    <HoverTooltip
      content={
        <span className="flex flex-col">
          <span>Due {formatDateTime(new Date(run.at), 'system')}</span>
          <span className="font-mono">{run.invocationId}</span>
        </span>
      }
    >
      <Link
        href={`${baseUrl}/invocations/${encodeURIComponent(run.invocationId)}`}
        preserveQueryParams={false}
        variant="secondary"
        aria-label={`Open run ${run.invocationId}`}
        className={s.runLink()}
      >
        {invocation ? (
          <InvocationStatusBadge
            status={invocation.status}
            isRetrying={Boolean(invocation.isRetrying)}
            mini
          />
        ) : isPending ? (
          <span className="block h-5 w-16 animate-pulse rounded-full bg-emphasis/70" />
        ) : (
          <Badge size="sm">Not retained</Badge>
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
