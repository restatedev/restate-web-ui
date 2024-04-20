import { PropsWithChildren } from 'react';
import { RadioGroup as AriaRadioGroup } from 'react-aria-components';

interface RadioGroupProps {
  name: string;
  required?: boolean;
}

export function RadioGroup({
  children,
  required,
  ...props
}: PropsWithChildren<RadioGroupProps>) {
  return (
    <AriaRadioGroup
      {...props}
      isRequired={required}
      className="group flex flex-col gap-2"
    >
      {children}
    </AriaRadioGroup>
  );
}
