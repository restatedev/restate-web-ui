import { Children, PropsWithChildren, useId } from 'react';
import { DisclosureTrigger } from '@restate/ui-disclosure';
import { tv } from '@restate/util-styles';

interface SummaryProps {
  className?: string;
}

const summaryStyles = tv({
  base: 'relative py-2 pr-10 pl-3 group-data-expanded/details:mb-2',
});

export function Summary({
  children,
  className,
}: PropsWithChildren<SummaryProps>) {
  const id = useId();
  return (
    <div className={summaryStyles({ className })}>
      <DisclosureTrigger variant="row" aria-labelledby={id} />
      <div id={id}>{children}</div>
    </div>
  );
}

export function isSummary(child: ReturnType<typeof Children.toArray>[number]) {
  return typeof child === 'object' && 'type' in child && child.type === Summary;
}
