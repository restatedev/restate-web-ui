import {
  NumberFieldProps as AriaNumberFieldProps,
  Input as AriaInput,
  Label,
  NumberField,
  Group,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
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
  base: 'text-center relative invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:border-gray-100 disabled:shadow-none   [&[readonly]]:text-gray-500/80 [&[readonly]]:bg-gray-100 read-only:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-10 w-full min-w-0 text-sm text-gray-900',
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
      ...props
    },
    ref
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
        <div className="relative min-h-[2.125rem]">
          <Group className="flex relative">
            <Button
              variant="secondary"
              slot="decrement"
              className="absolute left-0 top-0 bottom-0 z-10 p-0 aspect-square rounded-lg flex items-center justify-center"
            >
              <Icon name={IconName.Minus} className="w-4 h-4" />
            </Button>
            <AriaInput
              className={inputStyles}
              placeholder={placeholder}
              aria-label={placeholder}
              ref={ref}
            />
            <Button
              variant="secondary"
              slot="increment"
              className="absolute right-0 top-0 bottom-0 z-10 p-0 aspect-square rounded-lg flex items-center justify-center"
            >
              <Icon name={IconName.Plus} className="w-4 h-4" />
            </Button>
          </Group>
        </div>
        <FormFieldError children={errorMessage} />
      </NumberField>
    );
  }
);
