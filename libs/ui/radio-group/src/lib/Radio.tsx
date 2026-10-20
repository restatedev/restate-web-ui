import { focusRing } from '@restate/ui-focus';
import { PropsWithChildren } from 'react';
import { Radio as AriaRadio } from 'react-aria-components';
import { tv } from '@restate/util-styles';

interface RadioProps {
  value: string;
  disabled?: boolean;
  className?: string;
}

const styles = tv({
  extend: focusRing,
  base: 'h-5 w-5 rounded-full border-2 bg-surface transition-all',
  variants: {
    isSelected: {
      false: 'border-neutral group-pressed:border-neutral-strong',
      true: 'border-[7px] border-neutral-strong group-pressed:border-neutral-strong forced-colors:border-[Highlight]!',
    },
    isInvalid: {
      true: 'border-danger-strong group-pressed:border-danger-strong forced-colors:border-[Mark]!',
    },
    isDisabled: {
      true: 'border-default forced-colors:border-[GrayText]!',
    },
  },
});

export function Radio({
  children,
  disabled,
  className,
  ...props
}: PropsWithChildren<RadioProps>) {
  return (
    <AriaRadio
      {...props}
      className="group flex items-center gap-2 text-sm text-primary transition disabled:text-faint forced-colors:disabled:text-[GrayText]"
    >
      {(renderProps) => (
        <>
          <div className={styles(renderProps)} />
          {children}
        </>
      )}
    </AriaRadio>
  );
}
