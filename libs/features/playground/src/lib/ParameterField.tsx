import { useId, type ReactNode } from 'react';
import { tv } from '@restate/util-styles';
import { InfoButton } from './InfoButton';

const inputStyles = tv({
  base: 'w-full min-w-0 rounded-lg border border-inset bg-inset px-2 py-1.5 font-mono text-0.5xs text-primary shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)] placeholder:font-sans placeholder:text-placeholder focus:outline-2 focus:outline-focus',
  variants: {
    isInvalid: {
      true: 'border-danger-strong bg-danger-muted/70',
    },
  },
});

export function ParameterField({
  label,
  info,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = 'text',
  action,
}: {
  label: string;
  info?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: 'text' | 'password' | 'number';
  action?: ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-1 text-0.5xs font-medium text-secondary">
        <label htmlFor={id} className="font-mono">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
        {info && (
          <InfoButton label={label} isCode>
            {info}
          </InfoButton>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={inputStyles({ isInvalid: Boolean(error) })}
          onChange={(event) => onChange(event.target.value)}
        />
        {action}
      </div>
      {error && (
        <div id={errorId} className="text-xs text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
