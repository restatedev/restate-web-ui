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
}

const styles = tv({
  base: 'group bg-white rounded-xl border text-gray-800 shadow-sm p-1 has-[+details]:rounded-b-none has-[+details]:border-b-0 [&+details]:rounded-t-none [&:not([open]):has(+details)>summary]:rounded-b-none [&+details>summary]:rounded-t-none',
});
const summaryStyles = tv({
  extend: focusRing,
  base: 'flex gap-2 px-3 py-2 pressed:bg-gray-200 hover:bg-gray-100 rounded-[calc(.75rem_-_1px_-.25rem)] list-none group-open:mb-3 pr-2.5',
});

export function Details({
  children,
  open,
  className,
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
      <details className={styles({ className })} open={open}>
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
        <div className="px-3 my-3">{children}</div>
      </details>
    </DetailsProvider>
  );
}
