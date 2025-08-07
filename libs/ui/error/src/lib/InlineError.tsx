import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

export interface InlineErrorProps {
  className?: string;
}

const styles = tv({
  base: 'inline-flex items-center gap-1 text-start text-red-600',
});
export function InlineError({
  children,
  className,
}: PropsWithChildren<InlineErrorProps>) {
  return (
    <output className={styles({ className })}>
      <Icon
        className="h-[0.85em] w-[0.85em] text-red-500 group-focus:text-current"
        name={IconName.CircleX}
      />
      {children}
    </output>
  );
}
