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
import { PropsWithChildren, ReactElement, Ref, useRef, useState } from 'react';

const rowStyles = tv({
  extend: focusRing,
  base: ' group/row transform transition relative cursor-default -outline-offset-2 text-gray-900 disabled:text-gray-300 text-sm hover:bg-gray-100 selected:bg-blue-100 selected:hover:bg-blue-200',
  variants: {
    isVisible: {
      true: '[&_td]:opacity-100',
      false: '[&_td]:opacity-0',
    },
  },
  defaultVariants: {
    isVisible: true,
  },
});

interface RowProps<T extends object>
  extends Pick<AriaRowProps<T>, 'id' | 'columns' | 'children'> {
  className?: string;
  ref?: Ref<HTMLTableRowElement>;
}

export function Row<T extends object>({
  id,
  columns,
  children,
  className,
  ref,
  ...otherProps
}: PropsWithChildren<RowProps<T>>) {
  const { selectionBehavior, allowsDragging } = useTableOptions();

  return (
    <AriaRow
      ref={ref}
      id={id}
      {...otherProps}
      className={rowStyles({ className })}
    >
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
      {columns ? <Collection items={columns}>{children}</Collection> : children}
    </AriaRow>
  );
}

export function PerformantRow<T extends object>({
  children,
  columns,
  ...otherProps
}: Omit<RowProps<T>, 'children' | 'ref'> & {
  children: (item: T & { isVisible?: boolean }) => ReactElement;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  return (
    <Row
      ref={(el) => {
        if (el) {
          observerRef.current = new IntersectionObserver(
            ([entry]) => {
              setIsVisible(!!entry?.isIntersecting);
            },
            {
              root: null, // Use the viewport as the container
              rootMargin: '50% 0px 50% 0px',
              threshold: 0.1, // Trigger when 50% of the element is visible
            }
          );
          observerRef.current.observe(el);
        } else {
          observerRef.current?.disconnect();
          observerRef.current = undefined;
        }
      }}
      {...otherProps}
    >
      <Collection dependencies={[isVisible]} items={columns}>
        {(col) => children({ ...col, isVisible })}
      </Collection>
    </Row>
  );
}

const cellStyles = tv({
  extend: focusRing,
  base: 'pl-2 last:pr-2 focus-visible:outline-2 text-xs text-zinc-600 font-medium border-b group-last/row:border-b-0 [--selected-border:theme(colors.blue.200)] group-selected/row:border-[--selected-border] [:has(+[data-selected])_&]:border-[--selected-border] py-2 truncate -outline-offset-2',
});

interface CellProps extends Pick<AriaCellProps, 'id'> {
  className?: string;
}

export function Cell({ className, ...props }: PropsWithChildren<CellProps>) {
  return <AriaCell {...props} className={cellStyles({ className })} />;
}
