import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'rounded-sm px-1.5 text-sm pointer-coarse:hidden',
  variants: {
    variant: {
      dark: 'bg-inverse-emphasis text-inverse-muted',
      light: 'bg-emphasis/60 text-faint',
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
