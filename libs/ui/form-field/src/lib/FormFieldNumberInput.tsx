import {
  NumberFieldProps as AriaNumberFieldProps,
  Input as AriaInput,
  Label,
  NumberField,
  Group,
} from 'react-aria-components';
import { tv } from '@restate/util/styles';
import { FormFieldError } from './FormFieldError';
import {
  ComponentProps,
  forwardRef,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { FormFieldLabel } from './FormFieldLabel';
import { Icon, IconName } from '@restate/ui/icons';
import { Button } from '@restate/ui/button';

const inputStyles = tv({
  base: 'relative mt-0 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-100 px-10 py-1.5 text-center text-sm text-gray-900 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] placeholder:text-gray-500/70 invalid:border-red-600 invalid:bg-red-100/70 read-only:shadow-none focus:border-gray-200 focus:shadow-none focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] focus:outline focus:outline-blue-600 disabled:border-gray-100 disabled:text-gray-500/80 disabled:shadow-none disabled:placeholder:text-gray-300 [&[readonly]]:bg-gray-100 [&[readonly]]:text-gray-500/80',
});
const containerStyles = tv({
  base: 'group flex flex-col gap-1',
});

interface InputProps
  extends Pick<
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
