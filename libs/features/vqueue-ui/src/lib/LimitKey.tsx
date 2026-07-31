import { Chip, ChipSegment } from '@restate/ui/chip';
import { Copy } from '@restate/ui/copy';
import { Icon, IconName } from '@restate/ui/icons';
import {
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'inline-flex w-fit max-w-full min-w-0 align-middle',
    chip: 'max-w-full bg-white font-mono text-zinc-600',
    segment: 'max-w-full px-1.5',
    nestedSegment: 'bg-zinc-50 text-zinc-500',
    icon: 'h-3.5 w-3.5 shrink-0 text-zinc-400',
    copy: '-mr-1 ml-0.5 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5',
  },
  variants: {
    variant: {
      default: {
        segment: 'pr-1',
      },
      table: {
        root: 'w-full',
      },
    },
    hasNestedSegment: {
      true: {
        segment: 'min-w-20 pr-2.5',
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

  const separatorIndex = value.indexOf('/');
  const firstLevel =
    separatorIndex === -1 ? value : value.slice(0, separatorIndex);
  const secondLevel =
    separatorIndex === -1 ? undefined : value.slice(separatorIndex + 1);
  const { root, chip, segment, nestedSegment, icon, copy } = styles({
    variant,
    hasNestedSegment: secondLevel !== undefined,
  });
  const copyButton =
    variant !== 'table' ? <Copy copyText={value} className={copy()} /> : null;

  return (
    <span className={root({ className })} data-limit-key={value}>
      <TruncateWithTooltip
        tooltipContent={value}
        copyText={value}
        hideCopy={variant !== 'table'}
        overflowVisible
      >
        <Chip className={chip()}>
          <ChipSegment className={segment()}>
            <Icon name={IconName.LimitKey} className={icon()} />
            <TruncateTooltipTrigger>{firstLevel}</TruncateTooltipTrigger>
            {secondLevel === undefined && copyButton}
          </ChipSegment>
          {secondLevel !== undefined && (
            <ChipSegment className={nestedSegment()}>
              <TruncateTooltipTrigger>{secondLevel}</TruncateTooltipTrigger>
              {copyButton}
            </ChipSegment>
          )}
        </Chip>
      </TruncateWithTooltip>
    </span>
  );
}
