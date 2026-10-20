import {
  NumberFieldProps as AriaNumberFieldProps,
  Input as AriaInput,
  Label,
  NumberField,
  Group,
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
import { Icon, IconName } from '@restate/ui-icons';
import { Button } from '@restate/ui-button';

const inputStyles = tv({
  base: 'relative mt-0 w-full min-w-0 rounded-lg border border-default bg-muted px-10 py-1.5 text-center text-sm text-primary shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] placeholder:text-subtle invalid:border-danger-strong invalid:bg-danger-muted/70 read-only:shadow-none focus:border-default focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] focus:outline-2 focus:outline-focus disabled:border-muted disabled:text-subtle disabled:shadow-none disabled:placeholder:text-faint [&[readonly]]:bg-muted [&[readonly]]:text-subtle',
});
const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

interface InputProps extends Pick<
  AriaNumberFieldProps,
  | 'name'
  | 'value'
  | 'defaultValue'
  | 'autoFocus'
  | 'validate'
  | 'maxValue'
  | 'minValue'
  | 'onChange'
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
export const FormFieldNumberInput = forwardRef<
  HTMLInputElement,
  PropsWithChildren<InputProps>
>(
  (
    {
      className,
      required,
      disabled,
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
      <NumberField
        {...props}
        isRequired={required}
        isDisabled={disabled}
        isReadOnly={readonly}
        className={containerStyles({ className })}
      >
        {!label && <Label className="sr-only">{placeholder}</Label>}
        {label && <FormFieldLabel>{label}</FormFieldLabel>}
        <div className="relative min-h-8.5">
          <Group className="relative flex">
            <Button
              variant="secondary"
              slot="decrement"
              className="absolute top-0 bottom-0 left-0 z-10 flex aspect-square items-center justify-center rounded-lg p-0"
            >
              <Icon name={IconName.Minus} className="h-4 w-4" />
            </Button>
            <AriaInput
              className={inputStyles}
              placeholder={placeholder}
              aria-label={placeholder}
              ref={ref}
              form={form}
            />
            <Button
              variant="secondary"
              slot="increment"
              className="absolute top-0 right-0 bottom-0 z-10 flex aspect-square items-center justify-center rounded-lg p-0"
            >
              <Icon name={IconName.Plus} className="h-4 w-4" />
            </Button>
          </Group>
        </div>
        <FormFieldError children={errorMessage} />
      </NumberField>
    );
  },
);
