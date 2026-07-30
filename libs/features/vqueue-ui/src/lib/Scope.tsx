import { Chip, ChipSegment } from '@restate/ui/chip';
import { TruncateTooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 align-middle',
    chip: 'h-6.5 max-w-full text-xs font-medium text-zinc-600',
    segment: 'max-w-[22rem] bg-zinc-100 font-mono text-[90%] text-zinc-600',
    label:
      'inline-flex h-4 shrink-0 items-center rounded border border-zinc-300/80 bg-white/80 px-1 font-sans text-[0.5625rem] leading-none font-semibold tracking-[0.02em] text-zinc-500',
  },
});

export interface ScopeProps {
  value?: string;
  className?: string;
  containerClassName?: string;
}

export function Scope({ value, className, containerClassName }: ScopeProps) {
  if (value === undefined) return null;

  const { root, chip, segment, label } = styles();

  return (
    <span
      className={root({ className: containerClassName })}
      data-scope={value}
    >
      <Chip className={chip({ className })}>
        <ChipSegment className={segment()}>
          <span className={label()}>SCOPE</span>
          <TruncateTooltipTrigger>
            {value || <>&nbsp;</>}
          </TruncateTooltipTrigger>
        </ChipSegment>
      </Chip>
    </span>
  );
}
