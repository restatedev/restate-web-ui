import {
  getEndpoint,
  type Deployment,
} from '@restate/data-access-admin-api-spec';
import {
  buildStatusEntries,
  StackedStatusBar,
} from '@restate/features-status-chart';
import type { ServiceIssue } from '@restate/features-system-health';
import { Icon, IconName } from '@restate/ui-icons';
import { issueButtonStyles, issueIconStyles } from '@restate/ui-issue-banner';
import { Cell, type PanelTableColumn } from '@restate/ui-table';
import { RelativeDate } from '@restate/ui-tooltip';
import { formatNumber, formatPlurals } from '@restate/util-intl';
import { tv } from '@restate/util-styles';
import type { ReactElement } from 'react';
import { NotCompletedInvocationsCell } from './NotCompletedInvocationsCell';
import {
  getMetadataGroupKey,
  type ServiceGroup,
  type ServiceGroupBy,
} from './serviceGroups';
import type { OverviewService } from './sortServices';

export interface ServiceGroupTableRow<T extends OverviewService> {
  id: string;
  kind: 'group';
  group: ServiceGroup<T>;
}

export function isServiceGroupRow<T extends OverviewService>(
  row: object,
): row is ServiceGroupTableRow<T> {
  return 'kind' in row && row.kind === 'group';
}

const styles = tv({
  slots: {
    identity: 'flex min-w-0 items-center gap-2',
    count:
      'rounded bg-muted px-1 py-px text-2xs font-medium text-muted tabular-nums',
  },
});

const labelStyles = tv({
  base: 'truncate text-sm font-semibold text-primary',
  variants: {
    isMissing: {
      true: 'font-medium text-muted',
      false: '',
    },
  },
});

const chevronStyles = tv({
  base: 'h-5 w-5 shrink-0 p-0.5 text-subtle transition-transform',
  variants: {
    isExpanded: {
      true: 'rotate-90',
      false: '',
    },
  },
});

export function getServiceGroupLabel(
  group: ServiceGroup<OverviewService>,
  groupBy: ServiceGroupBy,
  deploymentsMap?: Map<string, Deployment>,
) {
  if (group.value === null) {
    return `No ${getMetadataGroupKey(groupBy) ?? 'value'}`;
  }
  if (groupBy === 'deployment') {
    return getEndpoint(deploymentsMap?.get(group.value)) ?? group.value;
  }
  return group.value;
}

export function renderServiceGroupCell<T extends OverviewService>({
  row,
  column,
  groupBy,
  isExpanded,
  deploymentsMap,
  stageCounts,
  serviceIssuesMap,
  isLoading,
  isError,
}: {
  row: ServiceGroupTableRow<T>;
  column: PanelTableColumn;
  groupBy: ServiceGroupBy;
  isExpanded: boolean;
  deploymentsMap?: Map<string, Deployment>;
  stageCounts: Map<string, { name: string; count: number }[]>;
  serviceIssuesMap: Map<string, ServiceIssue[]>;
  isLoading: boolean;
  isError: boolean;
}): ReactElement {
  const { group } = row;
  const { identity, count } = styles();
  const label = getServiceGroupLabel(group, groupBy, deploymentsMap);

  if (column.id === 'name') {
    return (
      <Cell className="[&&&]:overflow-visible">
        <div className={identity()}>
          <Icon
            name={IconName.ChevronRight}
            className={chevronStyles({ isExpanded })}
          />
          <span className={labelStyles({ isMissing: group.value === null })}>
            {label}
          </span>
          <span className={count()}>{group.services.length}</span>
        </div>
      </Cell>
    );
  }

  if (column.id === 'health') {
    const groupIssues = group.services.flatMap(
      (service) => serviceIssuesMap.get(service.name) ?? [],
    );
    const severity = groupIssues.some((issue) => issue.severity === 'high')
      ? 'high'
      : 'low';
    return (
      <Cell>
        {!isLoading && groupIssues.length > 0 ? (
          <span
            className={issueButtonStyles({
              severity,
              className: 'inline-flex',
            })}
          >
            <span className="relative mx-0.5 flex h-2.5 w-2.5 shrink-0">
              <Icon
                name={IconName.TriangleAlert}
                className={issueIconStyles({ severity })}
              />
            </span>
            {formatNumber(groupIssues.length)}
            <span className="sr-only">
              {formatPlurals(groupIssues.length, {
                one: 'issue',
                other: 'issues',
              })}{' '}
              in {label}
            </span>
          </span>
        ) : null}
      </Cell>
    );
  }

  if (column.id === 'invocations') {
    const merged = new Map<string, number>();
    for (const service of group.services) {
      for (const stage of stageCounts.get(service.name) ?? []) {
        merged.set(stage.name, (merged.get(stage.name) ?? 0) + stage.count);
      }
    }
    const entries = buildStatusEntries(
      Array.from(merged, ([status, value]) => ({ status, count: value })),
    ).filter(({ name }) => name !== 'finished');
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return (
      <NotCompletedInvocationsCell
        label={label}
        count={total}
        isLoading={isLoading}
        isError={isError}
      >
        <StackedStatusBar
          total={total}
          statuses={entries}
          isLoading={isLoading}
          ariaLabel={`Not-completed invocation status for ${label}`}
          tooltipContent={`${formatNumber(total)} not completed in ${label}`}
        />
      </NotCompletedInvocationsCell>
    );
  }

  if (column.id === 'created_at') {
    const latest = group.services
      .map((service) => deploymentsMap?.get(service.deployment_id)?.created_at)
      .filter((date): date is string => Boolean(date))
      .sort()
      .at(-1);
    return (
      <Cell>
        {latest ? <RelativeDate date={latest} title="Deployed at" /> : null}
      </Cell>
    );
  }

  return <Cell />;
}
