import { focusRing } from '@restate/ui/focus';
import { PropsWithChildren } from 'react';
import { Radio as AriaRadio } from 'react-aria-components';
import { tv } from '@restate/util/styles';

interface RadioProps {
  value: string;
  disabled?: boolean;
  className?: string;
}

const styles = tv({
  extend: focusRing,
  base: 'h-5 w-5 rounded-full border-2 bg-white transition-all dark:bg-zinc-900',
  variants: {
    isSelected: {
      false:
        'border-gray-400 group-pressed:border-gray-500 dark:border-zinc-400 dark:group-pressed:border-zinc-300',
      true: 'border-[7px] border-gray-700 group-pressed:border-gray-800 dark:border-slate-300 dark:group-pressed:border-slate-200 forced-colors:border-[Highlight]!',
    },
    isInvalid: {
      true: 'border-red-700 group-pressed:border-red-800 dark:border-red-600 dark:group-pressed:border-red-700 forced-colors:border-[Mark]!',
    },
    isDisabled: {
      true: 'border-gray-200 dark:border-zinc-700 forced-colors:border-[GrayText]!',
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
      className="group flex items-center gap-2 text-sm text-gray-800 transition disabled:text-gray-300 dark:text-zinc-200 dark:disabled:text-zinc-600 forced-colors:disabled:text-[GrayText]"
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
