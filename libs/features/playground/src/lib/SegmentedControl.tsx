import { useId } from 'react';
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

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const id = useId();
  const hasDescriptions = options.some((option) => option.description);
  return (
    <div
      role="group"
      aria-label={label}
      className={groupStyles({ hasDescriptions, className })}
    >
      {options.map((option) => {
        const descriptionId = `${id}-${option.value}`;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            aria-label={option.description ? option.label : undefined}
            aria-describedby={option.description ? descriptionId : undefined}
            className={itemStyles({
              isSelected: option.value === value,
              hasDescription: Boolean(option.description),
            })}
            onClick={() => onChange(option.value)}
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
          </button>
        );
      })}
    </div>
  );
}
