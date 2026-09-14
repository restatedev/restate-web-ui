import type { FilterItem } from '@restate/data-access/admin-api-spec';
import { useBatchOperations } from './BatchOperationsProvider';
import type {
  QueryClauseSchema,
  QueryClauseType,
} from '@restate/ui/query-builder';
import { formatPlurals } from '@restate/util/intl';
import { RestateMinimumVersion } from '@restate/features/restate-context';
import { Badge } from '@restate/ui/badge';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';

interface InvocationBatchActionsProps {
  filters: FilterItem[];
  invocationIds: string[];
  schema?: QueryClauseSchema<QueryClauseType>[];
  totalCount?: number;
  totalCountLabel?: string;
}

// Shared by the main invocation list and tenant view; callers supply their own filters.
export function InvocationBatchActions({
  filters,
  invocationIds,
  schema,
  totalCount,
  totalCountLabel = String(totalCount ?? 0),
}: InvocationBatchActionsProps) {
  const batch = useBatchOperations();
  const actions = [
    {
      id: 'cancel',
      label: 'Cancel',
      icon: IconName.Cancel,
      destructive: true,
      run: batch.batchCancel,
    },
    {
      id: 'pause',
      label: 'Pause',
      icon: IconName.Pause,
      destructive: true,
      run: batch.batchPause,
      minVersion: '1.6.0',
    },
    {
      id: 'resume',
      label: 'Resume',
      icon: IconName.Play,
      run: batch.batchResume,
    },
    {
      id: 'retry-now',
      label: 'Retry now',
      icon: IconName.RetryNow,
      run: batch.batchRetryNow,
    },
    {
      id: 'restart-as-new',
      label: 'Restart as new',
      icon: IconName.Restart,
      run: batch.batchRestartAsNew,
    },
    {
      id: 'kill',
      label: 'Kill',
      icon: IconName.Kill,
      destructive: true,
      run: batch.batchKill,
    },
    {
      id: 'purge',
      label: 'Purge',
      icon: IconName.Trash,
      destructive: true,
      run: batch.batchPurge,
    },
  ];

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button
          variant={invocationIds.length > 0 ? 'primary' : 'secondary'}
          className="flex items-center gap-1.5 self-end rounded-lg p-0.5 px-2 text-0.5xs"
        >
          Actions
          {Boolean(invocationIds.length || totalCount) && (
            <Badge
              size="xs"
              variant={invocationIds.length > 0 ? 'default' : 'info'}
            >
              {invocationIds.length > 0
                ? invocationIds.length
                : totalCountLabel}
            </Badge>
          )}
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 opacity-80"
          />
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection
          title={
            <span>
              Actions{' '}
              <span className="font-normal opacity-90">
                {invocationIds.length > 0
                  ? `on ${invocationIds.length} selected items`
                  : totalCount === undefined
                    ? 'on all matching invocations'
                    : totalCount > 0
                      ? `on all ${totalCountLabel} ${formatPlurals(totalCount, { one: 'result', other: 'results' })}`
                      : ''}
              </span>
            </span>
          }
        >
          <DropdownMenu
            onSelect={(id) => {
              const action = actions.find((action) => action.id === id);
              action?.run(
                invocationIds.length > 0 ? { invocationIds } : { filters },
                schema,
              );
            }}
          >
            {actions.map((action) => {
              const item = (
                <DropdownItem
                  key={action.id}
                  value={action.id}
                  destructive={action.destructive}
                >
                  <Icon
                    name={action.icon}
                    className="h-3.5 w-3.5 shrink-0 opacity-80"
                  />
                  {action.label}…
                </DropdownItem>
              );
              return action.minVersion ? (
                <RestateMinimumVersion
                  key={action.id}
                  minVersion={action.minVersion}
                >
                  {item}
                </RestateMinimumVersion>
              ) : (
                item
              );
            })}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
