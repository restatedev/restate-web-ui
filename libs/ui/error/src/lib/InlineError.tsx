import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

export interface InlineErrorProps {
  className?: string;
}

const styles = tv({
  base: 'inline-flex gap-1 items-center text-start text-red-700',
});
export function InlineError({
  children,
  className,
}: PropsWithChildren<InlineErrorProps>) {
  return (
    <output className={styles({ className })}>
      <Icon
        className="group-focus:text-current text-red-500 w-[0.85em] h-[0.85em]"
        name={IconName.CircleX}
      />
      {children}
    </output>
  );
}
