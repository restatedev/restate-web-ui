import { focusRing } from '@restate/ui/focus';
import { tv } from '@restate/util/styles';
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
import {
  PropsWithChildren,
  ReactElement,
  Ref,
  useDeferredValue,
  useState,
} from 'react';

const rowStyles = tv({
  extend: focusRing,
  base: 'group/row relative transform cursor-default text-sm text-gray-900 -outline-offset-2 transition [content-visibility:auto] hover:bg-gray-100 disabled:text-gray-300 selected:bg-blue-100 selected:hover:bg-blue-200',
});

interface RowProps<T extends object>
  extends Pick<
    AriaRowProps<T>,
    'id' | 'columns' | 'children' | 'dependencies'
  > {
  className?: string;
  ref?: Ref<HTMLTableRowElement>;
}

export function Row<T extends { id?: string }>({
  id,
  columns,
  children,
  className,
  ref,
  ...otherProps
}: RowProps<T>) {
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
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

export function PerformantRow<T extends { id?: string }>({
  children,
  ...otherProps
}: Omit<RowProps<T>, 'children' | 'ref'> & {
  children: (item: T & { isVisible?: boolean }) => ReactElement;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const deferredIsVisible = useDeferredValue(isVisible);
  const [observer] = useState(
    () =>
      new IntersectionObserver(
        ([entry]) => {
          setIsVisible(!!entry?.isIntersecting);
        },
        {
          root: null,
          rootMargin: '10% 0px 10% 0px',
          threshold: 0.1,
        },
      ),
  );

  return (
    <Row
      ref={(el) => {
        el && observer?.observe(el);
        return () => {
          el && observer?.unobserve(el);
        };
      }}
      {...otherProps}
      dependencies={[deferredIsVisible]}
    >
      {(col) => children({ ...col, isVisible: deferredIsVisible })}
    </Row>
  );
}

const cellStyles = tv({
  extend: focusRing,
  base: 'truncate border-b py-2 pl-2 text-xs font-medium text-zinc-600 -outline-offset-2 [--selected-border:var(--color-blue-200)] group-last/row:border-b-0 group-selected/row:border-[--selected-border] last:pr-2 focus-visible:outline-2 in-[:has(+[data-selected])]:border-(--selected-border)',
});

interface CellProps extends Pick<AriaCellProps, 'id'> {
  className?: string;
}

export function Cell({ className, ...props }: PropsWithChildren<CellProps>) {
  return <AriaCell {...props} className={cellStyles({ className })} />;
}
