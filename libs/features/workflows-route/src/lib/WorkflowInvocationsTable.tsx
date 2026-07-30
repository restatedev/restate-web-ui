import { useFeatures } from '@restate/data-access/admin-api';
import type { components } from '@restate/data-access/admin-api-spec';
import {
  INVOCATION_TABLE_COLUMN_CONFIG,
  InvocationTableCell,
  type InvocationTableColumnKey,
} from '@restate/features/invocation-ui';
import { useRestateContext } from '@restate/features/restate-context';
import { EmptyState } from '@restate/ui/empty-state';
import { IconName } from '@restate/ui/icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { getSearchParams } from '@restate/util/panel';
import { useLocation, useNavigate } from 'react-router';

type Invocation = components['schemas']['InvocationV2'];
type ColumnId = InvocationTableColumnKey;

function getColumns(hasVqueues: boolean) {
  return [
    {
      ...INVOCATION_TABLE_COLUMN_CONFIG.id,
      id: 'id',
      name: 'Invocation',
      isRowHeader: true,
      minWidth: 250,
    },
    { ...INVOCATION_TABLE_COLUMN_CONFIG.created_at, id: 'created_at' },
    {
      ...INVOCATION_TABLE_COLUMN_CONFIG.target_handler_name,
      id: 'target_handler_name',
    },
    ...(hasVqueues
      ? [
          {
            ...INVOCATION_TABLE_COLUMN_CONFIG.vqueue_id,
            id: 'vqueue_id' as const,
          },
          {
            ...INVOCATION_TABLE_COLUMN_CONFIG.limit_key,
            id: 'limit_key' as const,
          },
        ]
      : []),
    { ...INVOCATION_TABLE_COLUMN_CONFIG.status, id: 'status' },
  ] satisfies PanelTableColumn<ColumnId>[];
}

export function WorkflowInvocationsTable({
  ariaLabel,
  rows,
  isPending,
  error,
  truncated,
  limit,
  emptyTitle,
  emptyDescription,
}: {
  ariaLabel: string;
  rows: Invocation[];
  isPending: boolean;
  error: Error | null;
  truncated?: boolean;
  limit?: number;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const features = useFeatures();
  const columns = getColumns(features.has('vqueues'));
  const { baseUrl } = useRestateContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <PanelTable
        aria-label={ariaLabel}
        columns={columns}
        items={rows}
        isLoading={isPending}
        error={error}
        numOfRows={6}
        bodyDependencies={[rows, error, columns]}
        onRowAction={(rowId) => {
          navigate(
            `${baseUrl}/invocations/${String(rowId)}${getSearchParams(location.search)}`,
          );
        }}
        rowClassName="cursor-pointer [content-visibility:auto]"
        emptyPlaceholder={
          <EmptyState
            icon={IconName.History}
            title={emptyTitle}
            description={emptyDescription}
          />
        }
        renderCell={(invocation, column) =>
          column.id in INVOCATION_TABLE_COLUMN_CONFIG ? (
            <InvocationTableCell
              column={column.id}
              row={{
                ...invocation,
                vqueue_id: invocation.vqueue?.vqueue_id ?? invocation.vqueue_id,
                stage: invocation.vqueue?.stage,
                status: invocation.vqueue?.status ?? invocation.status,
              }}
              invocation={invocation}
            />
          ) : (
            <Cell />
          )
        }
      />
      {truncated && (
        <div className="px-4 pt-3 text-xs text-zinc-500">
          Showing the {limit} most recent Shared invocations.
        </div>
      )}
    </>
  );
}
