import {
  SelectProps as AriaSelectProps,
  Label,
  Select,
  SelectValue,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';
import { FormFieldError } from './FormFieldError';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Button } from '@restate/ui/button';
import { PopoverOverlay } from '@restate/ui/popover';
import { ListBox, ListBoxItem } from '@restate/ui/listbox';
import { FormFieldLabel } from './FormFieldLabel';
import { Icon, IconName } from '@restate/ui/icons';

const containerStyles = tv({
  base: '',
});

interface SelectProps
  extends Pick<
    AriaSelectProps<object>,
    'name' | 'autoFocus' | 'autoComplete' | 'validate'
  > {
  className?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  errorMessage?: ComponentProps<typeof FormFieldError>['children'];
  label?: ReactNode;
}
export function FormFieldSelect({
  className,
  required,
  disabled,
  autoComplete = 'off',
  placeholder,
  errorMessage,
  children,
  label,
  autoFocus,
  ...props
}: PropsWithChildren<SelectProps>) {
  return (
    <Select
      {...props}
      autoComplete={autoComplete}
      isRequired={required}
      isDisabled={disabled}
      className={containerStyles({ className })}
      placeholder={placeholder}
    >
      {!label && <Label className="sr-only">{placeholder}</Label>}
      {label && <FormFieldLabel>{label}</FormFieldLabel>}
      <div className="shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] p-0.5 bg-gray-100 rounded-xl border border-gray-200">
        <Button
          autoFocus
          variant="secondary"
          className="group-invalid:border-red-600 group-invalid:bg-red-100/70 flex items-center gap-2 px-2 pt-1.5 text-sm w-full rounded-[0.625rem]"
        >
          <SelectValue
            className="flex-auto text-left placeholder-shown:text-gray-500"
            placeholder={placeholder}
          />
          <Icon
            name={IconName.ChevronsUpDown}
            className="w-[1.25em] h-[1.25em] text-gray-500"
          />
        </Button>
      </div>
      <PopoverOverlay className="min-w-[--trigger-width] p-0 bg-white/90">
        <ListBox
          className="bg-white2 border2 shadow-sm2 rounded-xl m-0 border-none"
          selectable
        >
          {children}
        </ListBox>
      </PopoverOverlay>
      <FormFieldError children={errorMessage} />
    </Select>
  );
}

export function Option({ children }: { children: string }) {
  return (
    <ListBoxItem className="px-2 rounded-lg" value={children}>
      {children}
    </ListBoxItem>
  );
}
