import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'max-w-[12ch] shrink-0 items-center truncate rounded-xl bg-white/50 px-2 font-mono text-[85%] leading-4 font-semibold text-zinc-500 uppercase ring-1 ring-zinc-500/20 ring-inset',
});
export function Revision({
  revision,
  className,
}: {
  revision: number;
  className?: string;
}) {
  return (
    <div className={styles({ className })}>
      <TruncateWithTooltip copyText={String(revision)}>
        <span className="uppercase">rev. {revision}</span>
      </TruncateWithTooltip>
    </div>
  );
}
