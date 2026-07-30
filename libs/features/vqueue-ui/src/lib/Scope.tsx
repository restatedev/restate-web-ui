import { Chip, ChipSegment } from '@restate/ui/chip';
import { TruncateTooltipTrigger } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 items-center align-middle',
    chip: 'h-6.5 max-w-full text-xs font-medium text-zinc-600',
    segment: 'max-w-[22rem] bg-zinc-100 font-mono text-[90%] text-zinc-600',
    inline:
      'inline-flex max-w-full min-w-0 items-center gap-1 font-mono text-[90%] text-zinc-600',
    label:
      'inline-flex h-4 shrink-0 items-center rounded border border-zinc-300/80 bg-white/80 px-1 font-sans text-[0.5625rem] leading-none font-semibold tracking-[0.02em] text-zinc-500',
    relationship: 'h-px w-3 shrink-0 bg-zinc-300',
  },
});

export type ScopePresentation = 'chip' | 'inline';
export type ScopeRelationship = 'target';

export interface ScopeProps {
  value?: string;
  className?: string;
  containerClassName?: string;
  presentation?: ScopePresentation;
  relationship?: ScopeRelationship;
}

export function Scope({
  value,
  className,
  containerClassName,
  presentation = 'chip',
  relationship,
}: ScopeProps) {
  if (value === undefined) return null;

  const {
    root,
    chip,
    segment,
    inline,
    label,
    relationship: relationshipStyle,
  } = styles();
  const content = (
    <>
      <span className={label()}>SCOPE</span>
      <TruncateTooltipTrigger>{value || <>&nbsp;</>}</TruncateTooltipTrigger>
    </>
  );

  return (
    <span
      className={root({ className: containerClassName })}
      data-scope={value}
      data-scope-relationship={relationship}
    >
      {presentation === 'chip' ? (
        <Chip
          right={relationship === 'target' ? 'angled' : 'straight'}
          className={chip({ className })}
        >
          <ChipSegment className={segment()}>{content}</ChipSegment>
        </Chip>
      ) : (
        <span className={inline({ className })}>{content}</span>
      )}
      {presentation === 'inline' && relationship === 'target' && (
        <span
          aria-hidden="true"
          className={relationshipStyle()}
          data-scope-connector
        />
      )}
    </span>
  );
}
