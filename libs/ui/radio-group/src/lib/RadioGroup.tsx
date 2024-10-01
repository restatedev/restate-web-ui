import { FormFieldError } from '@restate/ui/form-field';
import { PropsWithChildren } from 'react';
import {
  RadioGroup as AriaRadioGroup,
  RadioGroupProps as AriaRadioGroupProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface RadioGroupProps {
  name: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: AriaRadioGroupProps['onChange'];
}

const styles = tv({
  base: 'group flex flex-col gap-2',
});
export function RadioGroup({
  children,
  required,
  className,
  ...props
}: PropsWithChildren<RadioGroupProps>) {
  return (
    <AriaRadioGroup
      {...props}
      isRequired={required}
      className={styles({ className })}
    >
      {children}
      <FormFieldError />
    </AriaRadioGroup>
  );
}
