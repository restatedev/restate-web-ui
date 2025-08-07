import { Children, PropsWithChildren } from 'react';
import { usePress } from '@react-aria/interactions';
import { useFocusRing } from 'react-aria';
import { focusRing } from '@restate/ui/focus';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';

interface SummaryProps {
  className?: string;
}

const summaryStyles = tv({
  extend: focusRing,
  base: 'flex cursor-default list-none gap-2 rounded-[calc(.75rem-1px-.25rem)] px-3 py-2 pr-2.5 group-open:mb-2 hover:bg-gray-100 pressed:bg-gray-200 [&::-webkit-details-marker]:hidden',
});

export function Summary({
  children,
  className,
}: PropsWithChildren<SummaryProps>) {
  // const element = useSummaryElement();
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
    <summary
      {...pressProps}
      {...focusProps}
      {...(isPressed && { 'data-pressed': isPressed })}
      className={summaryStyles({ className, isFocusVisible })}
    >
      <div>{children}</div>
      <Icon
        name={IconName.ChevronDown}
        className="ml-auto shrink-0 text-sm text-gray-500 group-open:rotate-180"
      />
    </summary>
  );
}

export function isSummary(child: ReturnType<typeof Children.toArray>[number]) {
  return typeof child === 'object' && 'type' in child && child.type === Summary;
}
