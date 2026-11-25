import { PropsWithChildren } from 'react';
import {
  Disclosure as AriaDisclosure,
  DisclosurePanel as AriaDisclosurePanel,
} from 'react-aria-components';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';

export interface DisclosureProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const disclosureStyles = tv({
  base: '',
});

export function Disclosure({
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  className,
  children,
}: PropsWithChildren<DisclosureProps>) {
  return (
    <AriaDisclosure
      isExpanded={open}
      defaultExpanded={defaultOpen}
      onExpandedChange={onOpenChange}
      isDisabled={disabled}
      className={disclosureStyles({ className })}
    >
      {children}
    </AriaDisclosure>
  );
}

export type DisclosureTriggerVariant = 'ghost' | 'inline' | 'row';

type DisclosureTriggerName =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

export type DisclosureTriggerProps = { className?: string } & (
  | {
      variant?: Exclude<DisclosureTriggerVariant, 'row'>;
      'aria-label'?: string;
      'aria-labelledby'?: string;
    }
  | ({ variant: 'row' } & DisclosureTriggerName)
);

const triggerStyles = tv({
  slots: {
    button: 'group/trigger',
    chevron: 'transition-transform group-aria-expanded/trigger:rotate-180',
  },
  variants: {
    variant: {
      ghost: {},
      inline: {
        button:
          'inline-flex h-auto gap-0.5 px-1 py-0 align-baseline text-[length:inherit] font-medium text-current hover:text-current',
      },
      row: {
        button:
          'absolute inset-0 justify-end rounded-[calc(0.75rem-0.175rem)] p-2 text-sm text-subtle hover:bg-tint-subtle pressed:bg-tint',
      },
    },
  },
  defaultVariants: {
    variant: 'ghost',
  },
});

const CHEVRON_SIZE = {
  ghost: 'xs',
  inline: 'sm',
  row: undefined,
} as const;

export function DisclosureTrigger({
  variant = 'ghost',
  className,
  children,
  ...props
}: PropsWithChildren<DisclosureTriggerProps>) {
  const { button, chevron } = triggerStyles({ variant });
  return (
    <Button
      {...props}
      slot="trigger"
      variant={variant === 'row' ? 'icon' : 'ghost'}
      className={button({ className })}
    >
      {children}
      <Icon
        name={IconName.ChevronDown}
        size={CHEVRON_SIZE[variant]}
        className={chevron()}
      />
    </Button>
  );
}

export interface DisclosurePanelProps {
  animated?: boolean;
  className?: string;
}

const panelStyles = tv({
  base: '',
  variants: {
    animated: {
      true: 'h-(--disclosure-panel-height) overflow-clip motion-safe:transition-[height]',
      false: '',
    },
  },
  defaultVariants: {
    animated: false,
  },
});

export function DisclosurePanel({
  animated,
  className,
  children,
}: PropsWithChildren<DisclosurePanelProps>) {
  return (
    <AriaDisclosurePanel className={panelStyles({ animated, className })}>
      {children}
    </AriaDisclosurePanel>
  );
}
