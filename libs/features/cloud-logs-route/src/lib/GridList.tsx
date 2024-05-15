import { focusRing } from '@restate/ui/focus';
import { FormFieldCheckbox } from '@restate/ui/form-field';
import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  GridListItemProps,
  GridListProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

export function GridList<T extends object>({
  children,
  ...props
}: GridListProps<T>) {
  return <AriaGridList {...props}>{children}</AriaGridList>;
}

const itemStyles = tv({
  extend: focusRing,
  base: 'relative min-h-4 flex items-start gap-3 cursor-default select-none py-1.5 text-sm text-gray-800 border-y border-transparent first:border-t-0 last:border-b-0 -mb-px last:mb-0 -outline-offset-2',
  variants: {
    isSelected: {
      false: 'hover:bg-gray-100',
      true: 'bg-blue-100 hover:bg-blue-200 border-y-blue-200 z-20',
    },
    isDisabled: {
      true: 'text-slate-300 z-10',
    },
    selectionMode: {
      multiple: 'pl-1.5 pr-8',
      single: 'pl-1.5 pr-8',
      none: 'pl-8 pr-8',
    },
  },
});

export function GridListItem({ children, ...props }: GridListItemProps) {
  const textValue = typeof children === 'string' ? children : undefined;
  return (
    <AriaGridListItem
      textValue={textValue}
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        itemStyles({ ...renderProps, className })
      )}
    >
      {({ selectionMode, selectionBehavior, isSelected }) => (
        <>
          {selectionMode === 'multiple' && selectionBehavior === 'toggle' && (
            <div className="[&>*]:contents [&_label]:hidden">
              <FormFieldCheckbox
                slot="selection"
                className="w-3.5 h-3.5"
                checked={isSelected}
              />
            </div>
          )}
          {children}
        </>
      )}
    </AriaGridListItem>
  );
}
