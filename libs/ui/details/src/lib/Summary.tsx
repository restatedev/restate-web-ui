import { Children, PropsWithChildren } from 'react';
import { usePress } from '@react-aria/interactions';
import { useFocusRing } from 'react-aria';
import { focusRing } from '@restate/ui/focus';
import { tv } from 'tailwind-variants';
import { Icon, IconName } from '@restate/ui/icons';

interface SummaryProps {
  className?: string;
}

const summaryStyles = tv({
  extend: focusRing,
  base: 'flex gap-2 px-3 py-2 pressed:bg-gray-200 hover:bg-gray-100 rounded-[calc(.75rem-1px-.25rem)] list-none group-open:mb-2 pr-2.5 [&::-webkit-details-marker]:hidden cursor-default',
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
        className="shrink-0 group-open:rotate-180 text-gray-500 ml-auto text-sm"
      />
    </summary>
  );
}

export function isSummary(child: ReturnType<typeof Children.toArray>[number]) {
  return typeof child === 'object' && 'type' in child && child.type === Summary;
}
