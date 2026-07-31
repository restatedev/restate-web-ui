import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

export type CardIntent =
  | 'success'
  | 'danger'
  | 'warning'
  | 'pending'
  | 'info'
  | 'default'
  | 'none';

const CardIntentContext = createContext<CardIntent>('none');

const cardStyles = tv({
  base: "relative isolate flex max-w-full min-w-0 flex-col divide-y divide-gray-100 overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/5%),0_12px_28px_-14px_--theme(--color-zinc-800/14%)] before:pointer-events-none before:absolute before:inset-0 before:bg-radial-[at_0%_0%] before:to-transparent before:to-50% before:content-[''] [&>*]:relative [&>*]:z-1",
  variants: {
    intent: {
      success: 'border-green-200/70 before:from-green-400/20',
      danger: 'border-red-200/70 before:from-red-400/20',
      warning: 'border-orange-200/70 before:from-orange-400/20',
      pending: 'border-amber-200/70 before:from-amber-400/20',
      info: 'border-blue-200/70 before:from-blue-400/20',
      default: 'border-gray-200/70 before:from-gray-400/15',
      none: 'border-gray-200/70 shadow-xs before:hidden',
    } satisfies Record<CardIntent, string>,
    span: {
      default: '',
      wide: 'md:col-span-2',
      full: 'col-span-full',
    },
  },
  defaultVariants: { intent: 'none', span: 'default' },
});

export function Card({
  intent = 'none',
  span,
  className,
  children,
}: PropsWithChildren<{
  intent?: CardIntent;
  span?: 'default' | 'wide' | 'full';
  className?: string;
}>) {
  return (
    <CardIntentContext.Provider value={intent}>
      <div className={cardStyles({ intent, span, className })}>{children}</div>
    </CardIntentContext.Provider>
  );
}

const cardHeaderStyles = tv({
  slots: {
    base: 'flex min-h-11 items-center gap-2 px-3',
    iconChip: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
    title: 'shrink-0 text-2xs font-semibold tracking-wide uppercase',
  },
  variants: {
    intent: {
      success: {
        iconChip: 'bg-green-100 text-green-700',
        title: 'text-green-800/70',
      },
      danger: {
        iconChip: 'bg-red-100 text-red-700',
        title: 'text-red-800/70',
      },
      warning: {
        iconChip: 'bg-orange-100 text-orange-700',
        title: 'text-orange-800/70',
      },
      pending: {
        iconChip: 'bg-amber-100 text-amber-700',
        title: 'text-amber-800/70',
      },
      info: {
        iconChip: 'bg-blue-100 text-blue-700',
        title: 'text-blue-800/70',
      },
      default: {
        iconChip: 'bg-gray-100 text-gray-500',
        title: 'text-gray-500',
      },
      none: {
        iconChip: 'bg-gray-100 text-gray-500',
        title: 'text-gray-500',
      },
    },
  },
  defaultVariants: { intent: 'none' },
});

export function CardHeader({
  title,
  icon,
  action,
  className,
  children,
}: PropsWithChildren<{
  title: string;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}>) {
  const intent = useContext(CardIntentContext);
  const styles = cardHeaderStyles({ intent });
  return (
    <div className={styles.base({ className })}>
      {icon && (
        <span className={styles.iconChip()}>
          <Icon name={icon} className="h-3.5 w-3.5" />
        </span>
      )}
      <h3 className={styles.title()}>{title}</h3>
      {children}
      <span className="min-w-2 flex-auto" />
      {action}
    </div>
  );
}

const cardRowStyles = tv({
  base: 'flex min-w-0 items-center gap-3 px-3',
  slots: {
    label: 'flex-auto shrink-0 font-medium',
  },
  variants: {
    variant: {
      hero: {
        base: 'min-h-13 py-2.5',
        label: 'text-0.5xs text-gray-500',
      },
      default: {
        base: 'min-h-8.5 py-1',
        label: 'text-2xs text-gray-400',
      },
    },
  },
  defaultVariants: { variant: 'default' },
});

export function CardRow({
  label,
  variant,
  className,
  children,
}: PropsWithChildren<{
  label?: string;
  variant?: 'hero' | 'default';
  className?: string;
}>) {
  const styles = cardRowStyles({ variant });
  return (
    <div className={styles.base({ className })}>
      {label && <span className={styles.label()}>{label}</span>}
      {children}
    </div>
  );
}

export function CardLinkRow({
  href,
  'aria-label': ariaLabel,
  variant,
  className,
  children,
}: PropsWithChildren<{
  href: string;
  'aria-label'?: string;
  variant?: 'hero' | 'default';
  className?: string;
}>) {
  const styles = cardRowStyles({ variant });
  return (
    <Link
      href={href}
      variant="secondary"
      aria-label={ariaLabel}
      className={styles.base({
        className: [
          'group rounded-none no-underline -outline-offset-2 hover:bg-gray-50 pressed:bg-gray-100/70',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      })}
    >
      {children}
      <span className="min-w-2 flex-auto" />
      <Icon
        name={IconName.ChevronRight}
        className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
