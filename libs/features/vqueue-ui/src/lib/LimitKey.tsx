import { Badge } from '@restate/ui/badge';
import { Copy } from '@restate/ui/copy';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'min-w-0 font-mono',
    value: 'min-w-0 truncate',
    copy: 'ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5',
  },
  variants: {
    variant: {
      default: {
        root: 'py-0 pr-0 align-middle',
      },
      table: {
        root: 'w-full border-none bg-transparent pl-0',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface LimitKeyProps {
  value?: string;
  variant?: 'default' | 'table';
  className?: string;
}

export function LimitKey({
  value,
  variant = 'default',
  className,
}: LimitKeyProps) {
  if (!value) return null;

  const { root, value: valueStyle, copy } = styles({ variant });

  return (
    <Badge
      size={variant === 'table' ? 'base' : 'sm'}
      className={root({ className })}
      data-limit-key={value}
    >
      {variant === 'table' ? (
        <TruncateWithTooltip copyText={value}>{value}</TruncateWithTooltip>
      ) : (
        <>
          <span className={valueStyle()}>{value}</span>
          <Copy copyText={value} className={copy()} />
        </>
      )}
    </Badge>
  );
}
