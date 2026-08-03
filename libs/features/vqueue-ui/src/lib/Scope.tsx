import { Chip, ChipSegment } from '@restate/ui/chip';
import { Copy } from '@restate/ui/copy';
import {
  TruncateTooltipTrigger,
  TruncateWithTooltip,
} from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    root: 'inline-flex max-w-full min-w-0 items-center align-middle',
    chip: 'max-w-full text-xs font-medium text-zinc-600',
    segment:
      'max-w-[22rem] bg-zinc-100 pl-1 font-mono text-[90%] text-zinc-600',
    inline:
      'inline-flex max-w-full min-w-0 items-center gap-1 font-mono text-[90%] text-zinc-600',
    label:
      'inline-flex h-4 shrink-0 items-center rounded border border-zinc-300/80 bg-white/80 px-1 font-sans text-[0.5625rem] leading-none font-semibold tracking-[0.02em] text-zinc-500',
    labelText: 'translate-y-px',
    relationship: 'h-px w-3 shrink-0 bg-zinc-300',
    copy: '-mr-1 ml-0.5 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5',
  },
  variants: {
    presentation: {
      chip: {},
      inline: {
        root: 'shrink-0',
      },
    },
    variant: {
      default: {},
      table: {
        root: 'w-full',
      },
    },
    hasCopy: {
      true: {
        segment: 'pr-1',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type ScopePresentation = 'chip' | 'inline';
export type ScopeRelationship = 'target';
export type ScopeLabelVariant = 'full' | 'compact';
export type ScopeVariant = 'default' | 'table';

export interface ScopeProps {
  value?: string;
  className?: string;
  containerClassName?: string;
  segmentClassName?: string;
  presentation?: ScopePresentation;
  relationship?: ScopeRelationship;
  labelVariant?: ScopeLabelVariant;
  variant?: ScopeVariant;
  showCopy?: boolean;
  showLabel?: boolean;
  href?: string;
  'aria-label'?: string;
}

export function Scope({
  value,
  className,
  containerClassName,
  segmentClassName,
  presentation = 'chip',
  relationship,
  labelVariant = 'full',
  variant = 'default',
  showCopy = false,
  showLabel = true,
  href,
  'aria-label': ariaLabel,
}: ScopeProps) {
  if (!value) return null;

  const {
    root,
    chip,
    segment,
    inline,
    label,
    labelText,
    relationship: relationshipStyle,
    copy,
  } = styles({ presentation, variant, hasCopy: showCopy });
  const content = (
    <>
      {showLabel && (
        <span className={label()}>
          <span
            aria-hidden={labelVariant === 'compact' ? true : undefined}
            className={labelText()}
          >
            {labelVariant === 'compact' ? 'S' : 'SCOPE'}
          </span>
          {labelVariant === 'compact' && <span className="sr-only">Scope</span>}
        </span>
      )}
      <TruncateTooltipTrigger>{value || <>&nbsp;</>}</TruncateTooltipTrigger>
      {showCopy && <Copy copyText={value} className={copy()} />}
    </>
  );
  const chipContent = (
    <Chip
      right={relationship === 'target' ? 'angled' : 'straight'}
      size="lg"
      className={chip({ className })}
      href={href}
      aria-label={ariaLabel}
    >
      <ChipSegment className={segment({ className: segmentClassName })}>
        {content}
      </ChipSegment>
    </Chip>
  );

  return (
    <span
      className={root({ className: containerClassName })}
      data-scope={value}
      data-scope-relationship={relationship}
    >
      {presentation === 'chip' ? (
        variant === 'table' ? (
          <TruncateWithTooltip
            tooltipContent={value}
            copyText={value}
            overflowVisible
          >
            {chipContent}
          </TruncateWithTooltip>
        ) : (
          chipContent
        )
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
