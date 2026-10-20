import {
  TextFieldProps as AriaTextFieldProps,
  Input as AriaInput,
  TextField,
  Label,
} from 'react-aria-components';
import { tv } from '@restate/util-styles';
import { FormFieldError } from './FormFieldError';
import {
  ComponentProps,
  forwardRef,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { FormFieldLabel } from './FormFieldLabel';

const inputStyles = tv({
  base: 'mt-0 w-full min-w-0 rounded-lg border border-default bg-muted px-2 py-1.5 text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-muted/70 read-only:text-primary focus:border-default focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] focus:outline-2 focus:outline-focus disabled:border-muted disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint [&[readonly]]:bg-muted',
});
const containerStyles = tv({
  base: '',
});

interface InputProps extends Pick<
  AriaTextFieldProps,
  | 'name'
  | 'value'
  | 'defaultValue'
  | 'autoFocus'
  | 'autoComplete'
  | 'validate'
  | 'pattern'
  | 'maxLength'
  | 'type'
  | 'onChange'
  | 'onKeyDown'
> {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  placeholder?: string;
  label?: ReactNode;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  form?: string;
}
export const FormFieldInput = forwardRef<
  HTMLInputElement,
  PropsWithChildren<InputProps>
>(
  (
    {
      className,
      required,
      disabled,
      autoComplete = 'off',
      placeholder,
      errorMessage,
      label,
      readonly,
      children,
      form,
      ...props
    },
    ref,
  ) => {
    return (
      <TextField
        {...props}
        autoComplete={autoComplete}
        isRequired={required}
        isDisabled={disabled}
        isReadOnly={readonly}
        className={containerStyles({ className })}
      >
        {!label && <Label className="sr-only">{placeholder}</Label>}
        {label && <FormFieldLabel>{label}</FormFieldLabel>}
        <div className="relative min-h-8.5">
          <AriaInput
            className={inputStyles}
            placeholder={placeholder}
            aria-label={placeholder}
            ref={ref}
            spellCheck={false}
            form={form}
            // `autoComplete="off"` (the default) stops the BROWSER's autofill,
            // but password managers ignore it for generic field names (e.g.
            // `name="name"`) and still show inline popups. There's no single
            // universal opt-out, so set each manager's ignore attribute too.
            // Fields that DO want autofill pass an explicit `autoComplete` (e.g.
            // "email") and keep all of these off.
            {...(autoComplete === 'off'
              ? {
                  'data-1p-ignore': true, // 1Password
                  'data-lpignore': 'true', // LastPass
                  'data-bwignore': true, // Bitwarden
                  'data-protonpass-ignore': 'true', // Proton Pass
                  'data-form-type': 'other', // Dashlane (treat as non-login)
                }
              : null)}
          />
          {children}
        </div>
        <FormFieldError children={errorMessage} />
      </TextField>
    );
  },
);
