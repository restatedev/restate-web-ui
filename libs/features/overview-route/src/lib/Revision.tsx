import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'uppercase max-w-[12ch] truncate shrink-0 font-semibold [font-size:85%] font-mono items-center rounded-xl px-2 leading-4 bg-white/50 ring-1 ring-inset ring-zinc-500/20 text-zinc-500',
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
