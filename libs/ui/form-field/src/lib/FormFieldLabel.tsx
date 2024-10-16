import { PropsWithChildren } from 'react';
import { Label as AriaLabel } from 'react-aria-components';

type FormFieldLabelProps = unknown;

export function FormFieldLabel(props: PropsWithChildren<FormFieldLabelProps>) {
  return (
    <AriaLabel
      {...props}
      className={`text-sm text-gray-700 flex flex-col gap-0.5 mb-1.5 font-medium cursor-default w-fit [&_[slot="title"]]:block [&_[slot="description"]]:block [&_[slot="description"]]:text-code [&_[slot="description"]]:font-normal [&_[slot="description"]]:text-gray-500`}
    />
  );
}
