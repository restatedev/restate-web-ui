import { PropsWithChildren, useId } from 'react';
import { tv } from 'tailwind-variants';
import { DetailsProvider } from './DetailsContext';
import { focusRing } from '@restate/ui/focus';
import { usePress } from '@react-aria/interactions';
import { useFocusRing } from 'react-aria';
import { Icon, IconName } from '@restate/ui/icons';

interface DetailsProps {
  open?: boolean;
  className?: string;
  disabled?: boolean;
}

const styles = tv({
  base: 'group bg-white rounded-xl border text-gray-800 shadow-sm p-1 has-[+details]:rounded-b-none has-[+details]:border-b-0 [&+details]:rounded-t-none [&:not([open]):has(+details)>summary]:rounded-b-none [&[open]>summary]:rounded-b-none [&+details>summary]:rounded-t-none',
  variants: {
    isDisabled: {
      false: '',
      true: '[&>summary]:pointer-events-none cursor-not-allowed',
    },
  },
  defaultVariants: {
    isDisabled: false,
  },
});
const summaryStyles = tv({
  extend: focusRing,
  base: 'flex gap-2 px-3 py-2 pressed:bg-gray-200 hover:bg-gray-100 rounded-[calc(.75rem_-_1px_-.25rem)] list-none group-open:mb-2 pr-2.5 [&::-webkit-details-marker]:hidden cursor-default',
});

export function Details({
  children,
  open,
  className,
  disabled,
}: PropsWithChildren<DetailsProps>) {
  const id = useId();
  const { pressProps, isPressed } = usePress({
    onPress: (event) => {
      if (event.pointerType === 'keyboard') {
        const details = event.target.closest('details');
        if (details instanceof HTMLDetailsElement) {
          details.open = !details.open;
        }
      }
    },
  });
  const { isFocusVisible, focusProps } = useFocusRing();
  return (
    <DetailsProvider id={id}>
      <details
        className={styles({ className, isDisabled: Boolean(disabled) })}
        open={open}
      >
        <summary
          {...pressProps}
          {...focusProps}
          {...(isPressed && { 'data-pressed': isPressed })}
          className={summaryStyles({ className, isFocusVisible })}
        >
          <div id={id} />
          <Icon
            name={IconName.ChevronDown}
            className="flex-shrink-0 group-open:rotate-180 text-gray-500 ml-auto text-sm"
          />
        </summary>
        <div className="px-4 py-6 border-t bg-gray-50 -m-1 rounded-b-xl group-has-[+details]:rounded-b-none">
          {children}
        </div>
      </details>
    </DetailsProvider>
  );
}
