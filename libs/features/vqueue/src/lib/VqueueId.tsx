import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'inline-flex min-w-0 items-center font-mono text-zinc-600',
});

// The vqueue id, presented like InvocationId: an icon tile, the id (middle-
// truncated, full value on hover), and a copy button. Lives in the vqueue lib
// so the Flow card can render it without depending on invocation-route.
export function VqueueId({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const short = id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-5)}` : id;
  return (
    <div className={styles({ className })}>
      <span className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
        <Icon
          name={IconName.Layers}
          className="h-3.5 w-3.5 rotate-90 text-zinc-500"
        />
      </span>
      <HoverTooltip content={id}>
        <span className="truncate text-2xs">{short}</span>
      </HoverTooltip>
      <Copy
        copyText={id}
        className="ml-0.5 shrink-0 p-1 text-zinc-400 [&_svg]:h-3 [&_svg]:w-3"
      />
    </div>
  );
}
