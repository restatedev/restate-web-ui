import { focusRing } from '@restate/ui/focus';
import { tv } from 'tailwind-variants';
import {
  Cell as AriaCell,
  Row as AriaRow,
  Button,
  CellProps as AriaCellProps,
  Collection,
  RowProps as AriaRowProps,
  useTableOptions,
} from 'react-aria-components';
import { Checkbox } from '@restate/ui/form-field';
import { PropsWithChildren } from 'react';

const rowStyles = tv({
  extend: focusRing,
  base: 'group/row relative cursor-default select-none -outline-offset-2 text-gray-900 disabled:text-gray-300 text-sm hover:bg-gray-100 selected:bg-blue-100 selected:hover:bg-blue-200',
});

interface RowProps<T extends object>
  extends Pick<AriaRowProps<T>, 'id' | 'columns'> {
  className?: string;
}

export function Row<T extends object>({
  id,
  columns,
  children,
  className,
  ...otherProps
}: PropsWithChildren<RowProps<T>>) {
  const { selectionBehavior, allowsDragging } = useTableOptions();

  return (
    <AriaRow id={id} {...otherProps} className={rowStyles({ className })}>
      {allowsDragging && (
        <Cell>
          <Button slot="drag">≡</Button>
        </Cell>
      )}
      {selectionBehavior === 'toggle' && (
        <Cell className="px-2">
          <Checkbox slot="selection" />
        </Cell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

const cellStyles = tv({
  extend: focusRing,
  base: 'pl-2 border-b group-last/row:border-b-0 [--selected-border:theme(colors.blue.200)] group-selected/row:border-[--selected-border] [:has(+[data-selected])_&]:border-[--selected-border] py-2 truncate -outline-offset-2',
});

interface CellProps extends Pick<AriaCellProps, 'id'> {
  className?: string;
}

export function Cell({ className, ...props }: PropsWithChildren<CellProps>) {
  return <AriaCell {...props} className={cellStyles({ className })} />;
}
