import { Fragment, ReactNode } from 'react';
import { GridListItem as AriaGridListItem } from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { useHrefWithQueryParams } from '@restate/ui/link';
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
  columns: { id: string; render: (item: T) => ReactNode }[];
}) {
  return (
    <div
      role="presentation"
      className="grid items-center gap-x-2"
      style={{ gridTemplateColumns: 'var(--grid-list-template-columns)' }}
    >
      {columns.map((column) => (
        <Fragment key={column.id}>{column.render(item)}</Fragment>
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
  const resolvedHref = useHrefWithQueryParams({
    preserveQueryParams: true,
    href,
  });

  return (
    <AriaGridListItem
      id={id}
      textValue={textValue}
      href={resolvedHref}
      className={itemStyles({ className })}
    >
      {({ isHovered, isPressed, isFocusVisible, isSelected }) => {
        const cells = <Cells item={item} columns={columns} />;
        return children
          ? children({
              cells,
              isHovered,
              isPressed,
              isFocusVisible,
              isSelected,
            })
          : cells;
      }}
    </AriaGridListItem>
  );
}
