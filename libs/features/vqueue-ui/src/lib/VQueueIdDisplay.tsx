import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: 'relative font-mono text-zinc-600',
  slots: {
    icon: 'mr-1.5 shrink-0 rounded-lg border bg-white',
    text: '',
    container: 'inline-flex w-full min-w-0 items-center align-middle',
  },
  variants: {
    size: {
      sm: {
        base: 'text-xs',
        icon: 'h-4 w-4 rounded-sm border-none bg-transparent',
        text: 'text-2xs',
      },
      md: {
        base: 'text-2xs',
        icon: 'h-6 w-6 rounded-lg shadow-xs',
        text: 'text-2xs',
      },
      default: {
        icon: 'h-6 w-6 rounded-lg shadow-xs',
        container: 'p-px',
      },
      icon: {
        icon: 'mr-0 h-6 w-6 rounded-lg shadow-xs',
        text: 'w-0 text-2xs',
        container: 'w-fit p-px',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export type VQueueIdSize = 'sm' | 'md' | 'default' | 'icon';

export interface VQueueIdDisplayProps {
  id: string;
  className?: string;
  size?: VQueueIdSize;
  truncateInMiddle?: boolean;
  showTooltip?: boolean;
  'aria-hidden'?: boolean;
}

export function VQueueIdDisplay({
  id,
  className,
  size = 'default',
  truncateInMiddle = false,
  showTooltip = true,
  'aria-hidden': ariaHidden,
}: VQueueIdDisplayProps) {
  const { base, icon, text, container } = styles({ size });
  const isIcon = size === 'icon';
  const visibleId =
    truncateInMiddle && id.length > 14
      ? `${id.substring(0, 8)}…${id.slice(-5)}`
      : id;

  const content = (
    <span className={container()}>
      <span className={icon()}>
        <Icon
          name={IconName.Layers}
          className="h-full w-full rotate-90 p-1 text-zinc-500"
        />
      </span>
      {!isIcon && (
        <span className="min-w-0 truncate">
          <span className={text()}>{visibleId}</span>
        </span>
      )}
    </span>
  );

  return (
    <span className={base({ className })} aria-hidden={ariaHidden}>
      {showTooltip ? (
        <TruncateWithTooltip
          tooltipContent={id}
          copyText={id}
          alwaysShow
          overflowVisible
        >
          {content}
        </TruncateWithTooltip>
      ) : (
        content
      )}
    </span>
  );
}
