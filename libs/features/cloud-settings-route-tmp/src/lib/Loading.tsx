import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'animate-pulse bg-slate-200 absolute inset-0 border',
});
export function Loading({ className }: { className?: string }) {
  return <div className={styles({ className })} />;
}
