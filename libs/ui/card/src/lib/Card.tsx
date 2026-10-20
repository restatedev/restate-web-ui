import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { tv } from '@restate/util-styles';
import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
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
    box: "relative isolate flex max-w-full min-w-0 flex-auto flex-col divide-y divide-default overflow-hidden rounded-xl border bg-subtle shadow-xs before:pointer-events-none before:absolute before:inset-0 before:bg-radial-[800px_400px_at_0%_0%] before:to-transparent before:to-50% before:content-[''] [&>*]:relative [&>*]:z-1 [&>*+*]:shadow-[inset_0_1px_0_var(--box-shadow-color-edge)]",
  },
  variants: {
    intent: {
      success: { box: 'border-success/70 before:from-success-vivid/20' },
      danger: { box: 'border-danger/70 before:from-danger-vivid/20' },
      warning: { box: 'border-warning/70 before:from-warning-vivid/20' },
      pending: { box: 'border-pending/70 before:from-pending-vivid/20' },
      info: { box: 'border-info/70 before:from-info-vivid/20' },
      default: { box: 'border-default/70 before:from-(--sheen)' },
      none: {
        box: 'border-default ring-1 ring-surface/50 ring-inset before:from-(--sheen)',
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
    tab: 'relative z-1 -mb-px flex h-8 min-w-0 shrink-0 items-center gap-1.5 self-end rounded-t-lg border border-b-0 bg-subtle px-2.5',
    icon: 'h-3.5 w-3.5 shrink-0',
    title: 'truncate text-xs leading-none font-semibold',
  },
  variants: {
    intent: {
      success: {
        tab: 'border-success/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-success-vivid/20 to-transparent to-50%',
        icon: 'text-success',
        title: 'text-success-strong',
      },
      danger: {
        tab: 'border-danger/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-danger-vivid/20 to-transparent to-50%',
        icon: 'text-danger',
        title: 'text-danger-strong',
      },
      warning: {
        tab: 'border-warning/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-warning-vivid/20 to-transparent to-50%',
        icon: 'text-warning',
        title: 'text-warning-strong',
      },
      pending: {
        tab: 'border-pending/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-pending-vivid/20 to-transparent to-50%',
        icon: 'text-pending',
        title: 'text-pending-strong',
      },
      info: {
        tab: 'border-info/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-info-vivid/20 to-transparent to-50%',
        icon: 'text-info',
        title: 'text-info-strong',
      },
      default: {
        tab: 'border-default/70 bg-radial-[800px_400px_at_-0.625rem_100%] from-(--sheen) to-transparent to-50%',
        icon: 'text-muted',
        title: 'text-tertiary',
      },
      none: {
        tab: 'border-default bg-radial-[800px_400px_at_-0.625rem_100%] from-(--sheen) to-transparent to-50%',
        icon: 'text-muted',
        title: 'text-tertiary',
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
      className="group flex items-center gap-0.5 text-2xs font-medium text-subtle no-underline transition-colors hover:text-tertiary"
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
    stretchedLink:
      "rounded-none no-underline -outline-offset-2 after:absolute after:inset-0 after:z-0 after:content-['']",
    labelAction: 'relative z-10 flex shrink-0',
  },
  variants: {
    variant: {
      hero: {
        base: 'min-h-13 py-2.5',
        label: 'text-0.5xs text-muted',
      },
      default: {
        base: 'min-h-8.5 py-1',
        label: 'text-2xs text-subtle',
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
  base: 'shrink-0 text-xl font-semibold tracking-tight text-primary tabular-nums',
});

export function CardHeroValue({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <span className={cardHeroValueStyles({ className })}>{children}</span>;
}

type CardLinkRowProps = PropsWithChildren<
  {
    href: string;
    label?: ReactNode;
    variant?: 'hero' | 'default';
    showChevron?: boolean;
    className?: string;
  } & (
    | {
        allowsInteractiveChildren: true;
        'aria-label': string;
        labelAction?: ReactNode;
      }
    | {
        allowsInteractiveChildren?: false;
        'aria-label'?: string;
        labelAction?: never;
      }
  )
>;

export function CardLinkRow({
  href,
  'aria-label': ariaLabel,
  label,
  variant,
  showChevron = true,
  allowsInteractiveChildren = false,
  labelAction,
  className,
  children,
}: CardLinkRowProps) {
  const styles = cardRowStyles({ variant });
  const chevron = showChevron ? (
    <Icon
      name={IconName.ChevronRight}
      className="h-4 w-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5"
    />
  ) : null;
  const rowContent = (
    <>
      {label && <span className={styles.label()}>{label}</span>}
      {children}
      {!label && <span className="min-w-2 flex-auto" />}
      {chevron}
    </>
  );
  const rowClassName = styles.base({
    className: [
      'group rounded-none no-underline -outline-offset-2 transition-colors hover:bg-muted/70 pressed:bg-emphasis/70',
      className,
    ]
      .filter(Boolean)
      .join(' '),
  });

  if (allowsInteractiveChildren) {
    const stretchedLink =
      label && labelAction ? (
        <span
          className={styles.label({ className: 'flex items-center gap-1' })}
        >
          <Link
            href={href}
            variant="secondary"
            aria-label={ariaLabel}
            className={styles.stretchedLink({
              className: 'min-w-0 text-inherit',
            })}
          >
            {label}
          </Link>
          <span className={styles.labelAction()}>{labelAction}</span>
        </span>
      ) : (
        <Link
          href={href}
          variant="secondary"
          aria-label={ariaLabel}
          className={[
            label ? styles.label() : 'min-w-2 flex-auto',
            styles.stretchedLink(),
          ].join(' ')}
        >
          {label}
        </Link>
      );
    return (
      <div
        className={[
          rowClassName,
          'relative isolate has-[[data-pressed]]:bg-emphasis/70',
        ].join(' ')}
      >
        {label && stretchedLink}
        <div className="contents [&_a]:relative [&_a]:z-10 [&_button]:relative [&_button]:z-10">
          {children}
        </div>
        {!label && stretchedLink}
        {chevron}
      </div>
    );
  }

  return (
    <Link
      href={href}
      variant="secondary"
      aria-label={ariaLabel}
      className={rowClassName}
    >
      {rowContent}
    </Link>
  );
}

const cardButtonRowStyles = tv({
  slots: {
    shell: 'flex min-w-0',
    button:
      'group w-full justify-start rounded-none text-left font-normal shadow-none -outline-offset-2 transition-colors hover:bg-muted/70 pressed:bg-emphasis/70',
    chevron:
      'h-4 w-4 shrink-0 text-faint transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-muted',
    stretchedRow:
      'group relative isolate transition-colors hover:bg-muted/70 has-[[data-pressed]]:bg-emphasis/70',
    stretchedButton:
      'justify-start rounded-none border-0 p-0 text-left font-medium shadow-none -outline-offset-2 after:absolute after:inset-0 after:z-0 after:content-[""] hover:bg-transparent pressed:bg-transparent',
    interactiveChildren:
      'contents [&_a]:relative [&_a]:z-10 [&_button]:relative [&_button]:z-10',
  },
});

export const CardButtonRow = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<{
    label?: ReactNode;
    variant?: 'hero' | 'default';
    showChevron?: boolean;
    allowsInteractiveChildren?: boolean;
    renderButton?: (button: ReactNode) => ReactNode;
    rowRef?: Ref<HTMLDivElement>;
    className?: string;
    'aria-label'?: string;
  }>
>(function CardButtonRow(
  {
    label,
    variant,
    showChevron = true,
    allowsInteractiveChildren = false,
    renderButton = (button) => button,
    rowRef,
    className,
    children,
    ...rest
  },
  ref,
) {
  const styles = cardRowStyles({ variant });
  const buttonStyles = cardButtonRowStyles();
  const chevron = showChevron ? (
    <Icon name={IconName.ChevronRight} className={buttonStyles.chevron()} />
  ) : null;

  if (allowsInteractiveChildren) {
    return (
      <div
        ref={rowRef}
        className={styles.base({
          className: buttonStyles.stretchedRow({ className }),
        })}
      >
        {renderButton(
          <Button
            ref={ref}
            variant="icon"
            {...rest}
            className={styles.label({
              className: buttonStyles.stretchedButton(),
            })}
          >
            {label}
          </Button>,
        )}
        <div className={buttonStyles.interactiveChildren()}>{children}</div>
        {chevron}
      </div>
    );
  }

  return (
    <div className={buttonStyles.shell({ className })}>
      <Button
        ref={ref}
        variant="icon"
        {...rest}
        className={styles.base({ className: buttonStyles.button() })}
      >
        {label && <span className={styles.label()}>{label}</span>}
        {children}
        {!label && <span className="min-w-2 flex-auto" />}
        {chevron}
      </Button>
    </div>
  );
});
