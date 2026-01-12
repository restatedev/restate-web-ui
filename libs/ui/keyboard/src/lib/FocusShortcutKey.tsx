import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'rounded-sm bg-zinc-600 px-1.5 text-sm text-zinc-400',
});

export function FocusShortcutKey({ className }: { className?: string }) {
  return <kbd className={styles({ className })}>/</kbd>;
}
