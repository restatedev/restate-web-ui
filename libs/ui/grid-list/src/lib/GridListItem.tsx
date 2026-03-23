import { ReactNode, useMemo } from 'react';
import {
  GridListItem as AriaGridListItem,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { focusRing } from '@restate/ui/focus';
import { useGridListColumns } from './GridListContext';
import { GridListItemProps } from './types';

const itemStyles = tv({
  extend: focusRing,
  base: 'cursor-default outline-none -outline-offset-2',
});

function Cells<T>({
  item,
  columns,
}: {
  item: T;
  columns: { id: string; render: (item: T) => ReactNode; width?: string }[];
}) {
  const gridTemplateColumns = useMemo(
    () => columns.map((c) => c.width ?? '1fr').join(' '),
    [columns]
  );

  return (
    <div
      role="presentation"
      className="grid items-center gap-x-2 px-3 py-2"
      style={{ gridTemplateColumns }}
    >
      {columns.map((column) => (
        <div key={column.id} className="min-w-0 truncate">
          {column.render(item)}
        </div>
      ))}
    </div>
  );
}

export function GridListItem<T>({
  id,
  item,
  textValue,
  children,
  className,
}: GridListItemProps<T>) {
  const columns = useGridListColumns<T>();

  const cells = <Cells item={item} columns={columns} />;

  return (
    <AriaGridListItem
      id={id}
      textValue={textValue}
      className={composeRenderProps(className, (cls, renderProps) =>
        itemStyles({ ...renderProps, className: cls })
      )}
    >
      {children ? children({ cells }) : cells}
    </AriaGridListItem>
  );
}
