import { useId, type Key } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import { tv } from '@restate/util-styles';

const groupStyles = tv({
  base: 'inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-tint-subtle p-0.5',
  variants: {
    hasDescriptions: { true: 'max-w-full shrink flex-wrap items-stretch' },
  },
});

const itemStyles = tv({
  base: 'rounded-md px-2 py-0.5 text-0.5xs font-medium outline-offset-2 outline-focus focus-visible:outline-2',
  variants: {
    isSelected: {
      true: 'bg-raised text-primary shadow-xs ring-1 ring-tint',
      false: 'text-muted hover:text-secondary',
    },
    hasDescription: {
      true: 'flex flex-col items-start px-2.5 py-1 text-left',
    },
  },
});

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
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
      selectedKeys={[value]}
      onSelectionChange={onSelectionChange}
      className={groupStyles({ hasDescriptions, className })}
    >
      {options.map((option) => {
        const descriptionId = `${id}-${option.value}`;
        return (
          <ToggleButton
            key={option.value}
            id={option.value}
            aria-label={option.description ? option.label : undefined}
            aria-describedby={option.description ? descriptionId : undefined}
            className={({ isSelected }) =>
              itemStyles({
                isSelected,
                hasDescription: Boolean(option.description),
              })
            }
          >
            <span>{option.label}</span>
            {option.description && (
              <span
                id={descriptionId}
                className="text-2xs font-normal text-muted"
              >
                {option.description}
              </span>
            )}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}
