import { PropsWithChildren, ReactNode } from 'react';
import { tv } from '@restate/util-styles';
import { Icon, IconName } from '@restate/ui-icons';

export type EmptyStateIntent =
  | 'neutral'
  | 'danger'
  | 'warning'
  | 'info'
  | 'success';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  iconClassName?: string;
  intent?: EmptyStateIntent;
  className?: string;
  contentClassName?: string;
}

const styles = tv({
  slots: {
    base: 'flex min-h-0 w-full flex-1 flex-col items-center justify-center px-5 py-12',
    content: 'flex w-full max-w-md flex-col items-center text-center',
    badge:
      'flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xs',
    icon: 'h-7 w-7 drop-shadow-md',
    title: 'text-base font-semibold text-primary',
    description: 'mt-2 text-sm leading-relaxed text-muted',
    actions: 'mt-6 flex w-full flex-col items-center gap-4',
  },
  variants: {
    intent: {
      neutral: {
        badge: 'border-default bg-surface',
        icon: 'text-subtle',
      },
      danger: {
        badge: 'border-danger bg-danger-subtle/40',
        icon: 'fill-danger-muted text-danger',
      },
      warning: {
        badge: 'border-warning bg-warning-subtle/40',
        icon: 'fill-warning-muted text-warning-subtle',
      },
      info: {
        badge: 'border-accent bg-accent-subtle/40',
        icon: 'fill-accent-muted text-accent',
      },
      success: {
        badge: 'border-success bg-success-subtle/40',
        icon: 'fill-success-muted text-success-subtle',
      },
    },
    hasIcon: {
      true: { title: 'mt-5' },
    },
  },
  defaultVariants: { intent: 'neutral' },
});

export function EmptyState({
  title,
  description,
  icon,
  iconClassName,
  intent,
  className,
  contentClassName,
  children,
}: PropsWithChildren<EmptyStateProps>) {
  const {
    base,
    content,
    badge,
    icon: iconSlot,
    title: titleSlot,
    description: descriptionSlot,
    actions,
  } = styles({ intent });
  return (
    <div className={base({ className })}>
      <div className={content({ className: contentClassName })}>
        {icon && (
          <div className={badge()}>
            <Icon
              name={icon}
              className={iconSlot({ className: iconClassName })}
            />
          </div>
        )}
        <h2 className={titleSlot({ hasIcon: Boolean(icon) })}>{title}</h2>
        {description && <p className={descriptionSlot()}>{description}</p>}
        {children && <div className={actions()}>{children}</div>}
      </div>
    </div>
  );
}
