import { Invocation } from '@restate/data-access/admin-api';
import { Cell } from '@restate/ui/table';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { ColumnKey } from './columns';
import { ComponentType, useRef } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';

interface CellProps {
  invocation: Invocation;
}

function Id({ invocation }: CellProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Cell className="relative flex items-center font-mono text-code">
      <div className="mr-1.5 shrink-0 h-6 w-6 bg-white border shadow-sm rounded-md">
        <Icon
          name={IconName.Invocation}
          className="w-full h-full text-zinc-500 p-1"
        />
      </div>
      <TruncateWithTooltip copyText={invocation.id} triggerRef={linkRef}>
        {invocation.id}
      </TruncateWithTooltip>
      <Link
        ref={linkRef}
        href="?a=b"
        aria-label={invocation.id}
        variant="secondary"
        className="outline-offset-0 m-1 ml-0 rounded-full before:absolute before:inset-0 before:rounded-r-xl before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5"
      >
        <Icon
          name={IconName.ChevronRight}
          className="w-4 h-4 text-gray-500 shrink-0 "
        />
      </Link>
    </Cell>
  );
}

function Target({ invocation }: CellProps) {
  return (
    <Cell>
      {invocation.target_service_name}/{invocation.target_handler_name}
    </Cell>
  );
}

function Status({ invocation }: CellProps) {
  return <Cell>{invocation.status}</Cell>;
}

function InvokedBy({ invocation }: CellProps) {
  return (
    <Cell>
      <TruncateWithTooltip copyText={invocation.invoked_by}>
        {invocation.invoked_by}
      </TruncateWithTooltip>
    </Cell>
  );
}

function CreatedAt({ invocation }: CellProps) {
  return (
    <Cell>
      <TruncateWithTooltip copyText={invocation.created_at}>
        {invocation.created_at}
      </TruncateWithTooltip>
    </Cell>
  );
}

function ModifiedAt({ invocation }: CellProps) {
  return (
    <Cell>
      <TruncateWithTooltip copyText={invocation.modified_at}>
        {invocation.modified_at}
      </TruncateWithTooltip>
    </Cell>
  );
}

function ScheduledAt({ invocation }: CellProps) {
  return (
    <Cell>
      <TruncateWithTooltip copyText={invocation.scheduled_at}>
        {invocation.scheduled_at}
      </TruncateWithTooltip>
    </Cell>
  );
}

function Type({ invocation }: CellProps) {
  return (
    <Cell>
      {invocation.target_service_ty}
      {invocation.target_service_key ? `/${invocation.target_service_key}` : ''}
    </Cell>
  );
}

const CELLS: Record<ColumnKey, ComponentType<CellProps>> = {
  id: Id,
  target: Target,
  status: Status,
  type: Type,
  invoked_by: InvokedBy,
  created_at: CreatedAt,
  modified_at: ModifiedAt,
  scheduled_at: ScheduledAt,
};

export function InvocationCell({
  invocation,
  column,
}: CellProps & { column: ColumnKey }) {
  const Cell = CELLS[column];
  return <Cell invocation={invocation} />;
}
