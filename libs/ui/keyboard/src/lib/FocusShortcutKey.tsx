import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'rounded-sm px-1.5 text-sm',
  variants: {
    variant: {
      dark: 'bg-zinc-600 text-zinc-400',
      light: 'bg-gray-200/60 text-gray-400/60',
    },
  },
  defaultVariants: {
    variant: 'dark',
  },
});

export function FocusShortcutKey({
  className,
  variant,
}: {
  className?: string;
  variant?: 'dark' | 'light';
}) {
  return <kbd className={styles({ className, variant })}>/</kbd>;
}
