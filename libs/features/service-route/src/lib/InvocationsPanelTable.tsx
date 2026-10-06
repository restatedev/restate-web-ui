import type { components } from '@restate/data-access/admin-api-spec';
import {
  INVOCATION_TABLE_COLUMN_CONFIG,
  InvocationTableCell,
  type InvocationTableColumnKey,
} from '@restate/features/invocation-ui';
import { Actions } from '@restate/features/invocation-route';
import { useRestateContext } from '@restate/features/restate-context';
import { EmptyState } from '@restate/ui/empty-state';
import { IconName } from '@restate/ui/icons';
import { Cell, PanelTable, type PanelTableColumn } from '@restate/ui/table';
import { formatNumber } from '@restate/util/intl';
import { getSearchParams } from '@restate/util/panel';
import { useLocation, useNavigate } from 'react-router';

type Invocation = components['schemas']['InvocationV2'];
type InvocationsResponse = components['schemas']['ListInvocationsV2Response'];
export type InvocationsPanelColumn = PanelTableColumn<
  InvocationTableColumnKey | 'actions'
>;

const ID_COLUMN = {
  ...INVOCATION_TABLE_COLUMN_CONFIG.id,
  id: 'id',
  name: 'Invocation',
  isRowHeader: true,
  minWidth: 250,
} satisfies InvocationsPanelColumn;

const ACTIONS_COLUMN = {
  id: 'actions',
  name: 'Actions',
  width: 40,
  hideLabel: true,
} satisfies InvocationsPanelColumn;

export const SERVICE_INVOCATION_COLUMNS = [
  ID_COLUMN,
  { ...INVOCATION_TABLE_COLUMN_CONFIG.created_at, id: 'created_at' },
  {
    ...INVOCATION_TABLE_COLUMN_CONFIG.target_handler_name,
    id: 'target_handler_name',
  },
  { ...INVOCATION_TABLE_COLUMN_CONFIG.status, id: 'status' },
  ACTIONS_COLUMN,
] satisfies InvocationsPanelColumn[];

export const DEPLOYMENT_INVOCATION_COLUMNS = [
  ID_COLUMN,
  { ...INVOCATION_TABLE_COLUMN_CONFIG.created_at, id: 'created_at' },
  { ...INVOCATION_TABLE_COLUMN_CONFIG.target, id: 'target' },
  { ...INVOCATION_TABLE_COLUMN_CONFIG.status, id: 'status' },
  ACTIONS_COLUMN,
] satisfies InvocationsPanelColumn[];

export function InvocationsPanelTable({
  ariaLabel,
  columns,
  data,
  isPending,
  error,
  emptyTitle,
  emptyDescription,
}: {
  ariaLabel: string;
  columns: InvocationsPanelColumn[];
  data?: InvocationsResponse;
  isPending: boolean;
  error: Error | null;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { baseUrl } = useRestateContext();
  const location = useLocation();
  const navigate = useNavigate();
  const rows: Invocation[] = data?.rows ?? [];
  const isTruncated = data !== undefined && rows.length >= data.limit;

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
            icon={IconName.Invocation}
            title={emptyTitle}
            description={emptyDescription}
          />
        }
        renderCell={(invocation, column) =>
          column.id === 'actions' ? (
            <Cell className="align-top [&&&]:overflow-visible">
              <Actions invocation={invocation} />
            </Cell>
          ) : column.id in INVOCATION_TABLE_COLUMN_CONFIG ? (
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
      {isTruncated && (
        <div className="px-4 pt-3 text-xs text-zinc-500">
          Showing the {formatNumber(data.limit)} most recent invocations.
        </div>
      )}
    </>
  );
}
