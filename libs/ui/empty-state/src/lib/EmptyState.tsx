import { PropsWithChildren, ReactNode } from 'react';
import { tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';

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
  intent?: EmptyStateIntent;
  className?: string;
}

const styles = tv({
  slots: {
    base: 'flex min-h-0 w-full flex-1 flex-col items-center justify-center px-5 py-12',
    content: 'flex w-full max-w-md flex-col items-center text-center',
    badge:
      'flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xs',
    icon: 'h-7 w-7 drop-shadow-md',
    title: 'text-base font-semibold text-zinc-800',
    description: 'mt-2 text-sm leading-relaxed text-zinc-500',
    actions: 'mt-6 flex w-full flex-col items-center gap-4',
  },
  variants: {
    intent: {
      neutral: {
        badge: 'border-gray-200 bg-white',
        icon: 'fill-zinc-100 text-zinc-400',
      },
      danger: {
        badge: 'border-red-200 bg-red-50/40',
        icon: 'fill-red-100 text-red-500',
      },
      warning: {
        badge: 'border-orange-200 bg-orange-50/40',
        icon: 'fill-orange-100 text-orange-500',
      },
      info: {
        badge: 'border-blue-200 bg-blue-50/40',
        icon: 'fill-blue-100 text-blue-500',
      },
      success: {
        badge: 'border-green-200 bg-green-50/40',
        icon: 'fill-green-100 text-green-500',
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
  intent,
  className,
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
      <div className={content()}>
        {icon && (
          <div className={badge()}>
            <Icon name={icon} className={iconSlot()} />
          </div>
        )}
        <h2 className={titleSlot({ hasIcon: Boolean(icon) })}>{title}</h2>
        {description && <p className={descriptionSlot()}>{description}</p>}
        {children && <div className={actions()}>{children}</div>}
      </div>
    </div>
  );
}
