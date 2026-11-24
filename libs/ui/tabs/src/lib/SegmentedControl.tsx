import { useId, type Key, type ReactNode } from 'react';
import {
  SelectionIndicator,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';
import { HintTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

const groupStyles = tv({
  base: 'isolate',
  variants: {
    size: {
      sm: 'inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-tint-subtle p-0.5',
      md: 'relative flex max-w-full gap-0 rounded-xl border-[0.5px] border-tint-subtle bg-tint-subtle shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-default/3%)]',
    },
    hasDescriptions: { true: 'max-w-full shrink flex-wrap items-stretch' },
  },
  defaultVariants: { size: 'sm' },
});

const itemStyles = tv({
  base: 'relative isolate outline-offset-2 outline-focus focus-visible:outline-2',
  variants: {
    size: {
      sm: 'rounded-md px-2 py-0.5 text-0.5xs font-medium',
      md: 'flex min-h-0 cursor-default items-baseline justify-center gap-1.5 rounded-xl px-3 py-1.5 font-sans text-xs whitespace-nowrap transition forced-color-adjust-none [-webkit-tap-highlight-color:transparent]',
    },
    isSelected: {
      true: 'text-primary',
      false: '',
    },
    hasDescription: {
      true: 'flex flex-col items-start px-2.5 py-1 text-left',
    },
  },
  compoundVariants: [
    {
      size: 'sm',
      isSelected: false,
      className: 'text-muted hover:text-secondary',
    },
    {
      size: 'md',
      isSelected: false,
      className: 'text-tertiary hover:text-primary pressed:text-primary',
    },
  ],
  defaultVariants: { size: 'sm' },
});

const indicatorStyles = tv({
  base: 'absolute inset-0 -z-10 motion-safe:transition-[translate,width,height] motion-safe:duration-300 motion-safe:ease-out',
  variants: {
    size: {
      sm: 'rounded-md bg-raised shadow-xs ring-1 ring-tint',
      md: 'rounded-xl border border-tint bg-raised shadow-xs',
    },
  },
  defaultVariants: { size: 'sm' },
});

export type SegmentedControlSize = 'sm' | 'md';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  hint?: ReactNode;
  count?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedControlOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: SegmentedControlSize;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size,
  className,
}: SegmentedControlProps<T>) {
  const id = useId();
  const hasDescriptions = options.some((option) => option.description);
  const onSelectionChange = (keys: Set<Key>) => {
    const [key] = keys;
    const option = options.find((option) => option.value === key);
    if (option && option.value !== value) {
      onChange(option.value);
    }
  };

  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={value ? [value] : []}
      onSelectionChange={onSelectionChange}
      className={groupStyles({ size, hasDescriptions, className })}
    >
      {options.map((option) => {
        const descriptionId = `${id}-${option.value}`;
        return (
          <HintTooltip key={option.value} hint={option.hint} placement="bottom">
            <ToggleButton
              id={option.value}
              aria-label={option.description ? option.label : undefined}
              aria-describedby={option.description ? descriptionId : undefined}
              className={({ isSelected }) =>
                itemStyles({
                  size,
                  isSelected,
                  hasDescription: Boolean(option.description),
                })
              }
            >
              <SelectionIndicator className={indicatorStyles({ size })} />
              <span>{option.label}</span>
              {option.count}
              {option.description && (
                <span
                  id={descriptionId}
                  className="text-2xs font-normal text-muted"
                >
                  {option.description}
                </span>
              )}
            </ToggleButton>
          </HintTooltip>
        );
      })}
    </ToggleButtonGroup>
  );
}
