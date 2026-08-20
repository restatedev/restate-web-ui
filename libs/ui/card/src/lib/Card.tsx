import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';
import {
  Children,
  createContext,
  isValidElement,
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
  slots: {
    wrapper: 'flex max-w-full min-w-0 flex-col',
    box: "relative isolate flex max-w-full min-w-0 flex-auto flex-col divide-y divide-gray-200 overflow-hidden rounded-xl border bg-gray-50 shadow-xs before:pointer-events-none before:absolute before:inset-0 before:bg-radial-[800px_400px_at_0%_0%] before:to-transparent before:to-50% before:content-[''] [&>*]:relative [&>*]:z-1 [&>*+*]:shadow-[inset_0_1px_0_white]",
  },
  variants: {
    intent: {
      success: { box: 'border-green-200/70 before:from-green-400/20' },
      danger: { box: 'border-red-200/70 before:from-red-400/20' },
      warning: { box: 'border-orange-200/70 before:from-orange-400/20' },
      pending: { box: 'border-amber-200/70 before:from-amber-400/20' },
      info: { box: 'border-blue-200/70 before:from-blue-400/20' },
      default: { box: 'border-gray-200/70 before:from-white' },
      none: {
        box: 'border-gray-200 ring-1 ring-white/50 ring-inset before:from-white',
      },
    } satisfies Record<CardIntent, { box: string }>,
    span: {
      default: {},
      wide: { wrapper: 'md:col-span-2' },
      full: { wrapper: 'col-span-full' },
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
  const styles = cardStyles({ intent, span });
  const kids = Children.toArray(children);
  const header = kids.find(
    (kid) => isValidElement(kid) && kid.type === CardHeader,
  );
  const rest = header ? kids.filter((kid) => kid !== header) : kids;
  return (
    <CardIntentContext.Provider value={intent}>
      <div className={styles.wrapper({ className })}>
        {header}
        <div className={styles.box()}>{rest}</div>
      </div>
    </CardIntentContext.Provider>
  );
}

const cardHeaderStyles = tv({
  slots: {
    base: 'flex min-w-0 items-center gap-2 pr-2 pl-2.5',
    tab: 'relative z-1 -mb-px flex h-8 min-w-0 shrink-0 items-center gap-1.5 self-end rounded-t-lg border border-b-0 bg-gray-50 px-2.5',
    icon: 'h-3.5 w-3.5 shrink-0',
    title: 'truncate text-xs leading-none font-semibold',
  },
  variants: {
    intent: {
      success: {
        tab: 'border-green-200/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-green-400/20 to-transparent to-50%',
        icon: 'text-green-600',
        title: 'text-green-800/80',
      },
      danger: {
        tab: 'border-red-200/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-red-400/20 to-transparent to-50%',
        icon: 'text-red-600',
        title: 'text-red-800/80',
      },
      warning: {
        tab: 'border-orange-200/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-orange-400/20 to-transparent to-50%',
        icon: 'text-orange-600',
        title: 'text-orange-800/80',
      },
      pending: {
        tab: 'border-amber-200/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-amber-400/20 to-transparent to-50%',
        icon: 'text-amber-600',
        title: 'text-amber-800/80',
      },
      info: {
        tab: 'border-blue-200/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-blue-400/20 to-transparent to-50%',
        icon: 'text-blue-600',
        title: 'text-blue-800/80',
      },
      default: {
        tab: 'border-gray-200/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-white to-transparent to-50%',
        icon: 'text-zinc-500',
        title: 'text-zinc-600',
      },
      none: {
        tab: 'border-gray-200 bg-radial-[800px_400px_at_-0.625rem_100%] from-white to-transparent to-50%',
        icon: 'text-zinc-500',
        title: 'text-zinc-600',
      },
    },
  },
  defaultVariants: { intent: 'none' },
});

export function CardHeader({
  title,
  titleAddon,
  icon,
  iconClassName,
  action,
  className,
  children,
}: PropsWithChildren<{
  title: string;
  titleAddon?: ReactNode;
  icon?: IconName;
  iconClassName?: string;
  action?: ReactNode;
  className?: string;
}>) {
  const intent = useContext(CardIntentContext);
  const styles = cardHeaderStyles({ intent });
  return (
    <div className={styles.base({ className })}>
      <span className={styles.tab()}>
        {icon && (
          <Icon
            name={icon}
            className={styles.icon({ className: iconClassName })}
          />
        )}
        <h3 className={styles.title()}>{title}</h3>
        {titleAddon}
      </span>
      {children}
      <span className="min-w-2 flex-auto" />
      {action}
    </div>
  );
}

export function CardHeaderLink({
  href,
  'aria-label': ariaLabel,
  children,
}: PropsWithChildren<{ href: string; 'aria-label'?: string }>) {
  return (
    <Link
      href={href}
      variant="secondary"
      aria-label={ariaLabel}
      className="group flex items-center gap-0.5 text-2xs font-medium text-gray-400 no-underline transition-colors hover:text-gray-600"
    >
      {children}
      <Icon
        name={IconName.ChevronRight}
        className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </Link>
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
  label?: ReactNode;
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

const cardHeroValueStyles = tv({
  base: 'shrink-0 text-xl font-semibold tracking-tight text-zinc-800 tabular-nums',
});

export function CardHeroValue({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <span className={cardHeroValueStyles({ className })}>{children}</span>;
}

export function CardLinkRow({
  href,
  'aria-label': ariaLabel,
  label,
  variant,
  showChevron = true,
  className,
  children,
}: PropsWithChildren<{
  href: string;
  'aria-label'?: string;
  label?: ReactNode;
  variant?: 'hero' | 'default';
  showChevron?: boolean;
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
          'group rounded-none no-underline -outline-offset-2 transition-colors hover:bg-gray-100/70 pressed:bg-gray-200/70',
          className,
        ]
          .filter(Boolean)
          .join(' '),
      })}
    >
      {label && <span className={styles.label()}>{label}</span>}
      {children}
      {!label && <span className="min-w-2 flex-auto" />}
      {showChevron && (
        <Icon
          name={IconName.ChevronRight}
          className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      )}
    </Link>
  );
}
