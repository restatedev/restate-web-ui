import type { ReactNode } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { Spinner } from '@restate/ui-loading';
import { tv, type Intent } from '@restate/util-styles';

export type CalloutIntent = Extract<
  Intent,
  'info' | 'success' | 'warning' | 'danger'
>;

export interface CalloutProps {
  intent?: CalloutIntent;
  title?: ReactNode;
  icon?: IconName;
  isPending?: boolean;
  className?: string;
  children?: ReactNode;
}

const styles = tv({
  slots: {
    base: 'flex gap-2 rounded-xl border p-3 text-0.5xs',
    icon: '',
    spinner: 'flex h-5 w-5 shrink-0 items-center justify-center',
    title: 'font-semibold',
  },
  variants: {
    intent: {
      info: {
        base: 'border-info bg-info-subtle text-info',
        icon: 'fill-info text-on-info',
        spinner: 'text-info-subtle',
      },
      success: {
        base: 'border-success bg-success-subtle text-success',
        icon: 'fill-success text-on-success',
        spinner: 'text-success-subtle',
      },
      warning: {
        base: 'border-warning bg-warning-subtle text-warning',
        icon: 'fill-warning text-on-warning',
        spinner: 'text-warning-subtle',
      },
      danger: {
        base: 'border-danger bg-danger-subtle text-danger',
        icon: 'fill-danger text-on-danger',
        spinner: 'text-danger-subtle',
      },
    },
  },
  defaultVariants: {
    intent: 'info',
  },
});

const ICONS: Record<CalloutIntent, IconName> = {
  info: IconName.Info,
  success: IconName.CircleCheck,
  warning: IconName.TriangleAlert,
  danger: IconName.CircleAlert,
};

export function Callout({
  intent = 'info',
  title,
  icon,
  isPending = false,
  className,
  children,
}: CalloutProps) {
  const slots = styles({ intent });

  return (
    <div className={slots.base({ className })}>
      {isPending ? (
        <span className={slots.spinner()}>
          <Spinner size="md" />
        </span>
      ) : (
        <Icon name={icon ?? ICONS[intent]} size="lg" className={slots.icon()} />
      )}
      <div>
        {title && <span className={slots.title()}>{title}: </span>}
        {children}
      </div>
    </div>
  );
}
