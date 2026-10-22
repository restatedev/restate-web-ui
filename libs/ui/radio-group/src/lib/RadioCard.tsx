import { PropsWithChildren, ReactNode } from 'react';
import { Radio as AriaRadio } from 'react-aria-components';
import { tv } from '@restate/util-styles';

const cardsStyles = tv({
  base: 'flex flex-col gap-1 rounded-lg border border-inset bg-inset p-1 shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)]',
});

export function RadioCards({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cardsStyles({ className })}>{children}</div>;
}

const cardStyles = tv({
  slots: {
    base: 'group relative flex cursor-default items-start gap-2.5 rounded-md border bg-clip-padding px-3 py-2.5 transition-[background-color,border-color,box-shadow] duration-150 outline-none',
    mark: 'mt-0.5 h-4 w-4 shrink-0 rounded-full border bg-surface transition-[border-color,border-width] duration-150',
    label: 'text-sm font-medium',
    description: 'text-0.5xs text-muted',
  },
  variants: {
    isSelected: {
      true: {
        base: 'border-default bg-raised shadow-xs',
        mark: 'border-[5px] border-accent-strong',
        label: 'text-primary',
      },
      false: {
        base: 'border-transparent hover:bg-tint-subtle pressed:bg-tint',
        mark: 'border-neutral',
        label: 'text-tertiary',
      },
    },
    isFocusVisible: {
      true: { base: 'ring-2 ring-focus ring-offset-1 ring-offset-surface/80' },
    },
    isDisabled: {
      true: { base: 'opacity-50' },
    },
  },
});

export function RadioCard({
  value,
  label,
  description,
  className,
}: {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <AriaRadio
      value={value}
      className={({ isSelected, isFocusVisible, isDisabled }) =>
        cardStyles({ isSelected, isFocusVisible, isDisabled }).base({
          className,
        })
      }
    >
      {({ isSelected, isFocusVisible, isDisabled }) => {
        const styles = cardStyles({ isSelected, isFocusVisible, isDisabled });
        return (
          <>
            <span aria-hidden className={styles.mark()} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={styles.label()}>{label}</span>
              {description && (
                <span className={styles.description()}>{description}</span>
              )}
            </span>
          </>
        );
      }}
    </AriaRadio>
  );
}
