import { TruncateWithTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'max-w-[12ch] shrink-0 items-center truncate rounded-xl bg-surface/50 px-2 font-mono text-[80%] leading-4 font-semibold text-muted uppercase ring-1 ring-tint ring-inset',
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
