import { ReactNode, useMemo } from 'react';
import { GridListItem as AriaGridListItem } from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { useGridListColumns } from './GridListContext';
import { GridListItemProps } from './types';

const itemStyles = tv({
  base: 'cursor-default outline-none',
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
    [columns],
  );

  return (
    <div
      role="presentation"
      className="grid items-center gap-x-2"
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
  href,
  children,
  className,
}: GridListItemProps<T>) {
  const columns = useGridListColumns<T>();

  return (
    <AriaGridListItem
      id={id}
      textValue={textValue}
      href={href}
      className={itemStyles({ className })}
    >
      {({ isHovered, isPressed, isFocusVisible, isSelected }) => {
        const cells = <Cells item={item} columns={columns} />;
        return children
          ? children({ cells, isHovered, isPressed, isFocusVisible, isSelected })
          : cells;
      }}
    </AriaGridListItem>
  );
}
