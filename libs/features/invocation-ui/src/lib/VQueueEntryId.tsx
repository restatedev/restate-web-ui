import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';
import { InvocationId } from './InvocationId';

export interface VQueueEntryIdProps {
  id: string;
  className?: string;
  size?: 'sm' | 'md' | 'default';
}

const styles = tv({
  slots: {
    root: 'relative inline-flex w-fit max-w-full min-w-0 items-center font-mono text-zinc-600',
    icon: 'mr-1.5 shrink-0 rounded-lg border bg-white',
    text: 'min-w-0 truncate',
  },
  variants: {
    size: {
      sm: {
        root: 'text-xs',
        icon: 'h-4 w-4 rounded-sm border-none bg-transparent [&>svg]:p-px',
        text: 'text-2xs',
      },
      md: {
        root: 'text-2xs',
        icon: 'h-6 w-6 shadow-xs',
        text: 'text-2xs',
      },
      default: {
        icon: 'h-6 w-6 shadow-xs',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

function shortId(id: string) {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-5)}` : id;
}

export function VQueueEntryId({
  id,
  className,
  size = 'default',
}: VQueueEntryIdProps) {
  if (id.startsWith('inv_')) {
    return (
      <InvocationId
        id={id}
        className={className}
        size={size}
        truncateInMiddle
        popover={false}
      />
    );
  }

  const isStateMutation = id.startsWith('mut_');
  const entryStyles = styles({ size });
  return (
    <span
      className={entryStyles.root({ className })}
      aria-label={`${isStateMutation ? 'State mutation' : 'Queue entry'} ${id}`}
    >
      <span className={entryStyles.icon()}>
        <Icon
          name={isStateMutation ? IconName.Database : IconName.History}
          className="h-full w-full p-1 text-zinc-500"
        />
      </span>
      <TruncateWithTooltip
        copyText={id}
        tooltipContent={id}
        alwaysShow={id.length > 14}
        containerClassName={entryStyles.text()}
      >
        {shortId(id)}
      </TruncateWithTooltip>
    </span>
  );
}
