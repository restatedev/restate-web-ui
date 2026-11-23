import { Icon, IconName } from '@restate/ui-icons';
import { tv, type Intent } from '@restate/util-styles';

const styles = tv({
  slots: {
    base: 'relative h-3 w-3',
    dot: 'absolute top-px left-0 h-3 w-3 fill-current stroke-0',
    pulse:
      'absolute top-px left-0 h-3 w-3 animate-ping fill-current stroke-[4px] opacity-20',
  },
  variants: {
    intent: {
      neutral: { base: 'text-subtle' },
      info: { base: 'text-info-subtle' },
      success: { base: 'text-success-subtle' },
      warning: { base: 'text-warning-subtle' },
      danger: { base: 'text-danger-subtle' },
      pending: { base: 'text-pending-subtle' },
    },
  },
  defaultVariants: {
    intent: 'neutral',
  },
});

export interface StatusDotProps {
  intent?: Intent;
  pulse?: boolean;
  icon?: IconName;
  label?: string;
  className?: string;
}

export function StatusDot({
  intent = 'neutral',
  pulse = false,
  icon = IconName.Circle,
  label,
  className,
}: StatusDotProps) {
  const slots = styles({ intent });

  return (
    <div
      className={slots.base({ className })}
      {...(label
        ? { role: 'status', 'aria-label': label }
        : { 'aria-hidden': true })}
    >
      <Icon name={icon} className={slots.dot()} />
      {pulse && <Icon name={icon} className={slots.pulse()} />}
    </div>
  );
}
