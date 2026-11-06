import { tv } from '@restate/util-styles';

const groupStyles = tv({
  base: 'inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-tint-subtle p-0.5',
});

const itemStyles = tv({
  base: 'rounded-md px-2 py-0.5 text-0.5xs font-medium outline-offset-2 outline-focus focus-visible:outline-2',
  variants: {
    isSelected: {
      true: 'bg-raised text-primary shadow-xs ring-1 ring-tint',
      false: 'text-muted hover:text-secondary',
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
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={groupStyles({ className })}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={itemStyles({ isSelected: option.value === value })}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
