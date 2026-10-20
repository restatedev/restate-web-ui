import { Icon, type IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import type { PropsWithChildren, ReactNode } from 'react';

export type HeaderVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'pending'
  | 'info'
  | 'default';

export type HeaderIconProps =
  | {
      icon: IconName;
      iconLabel: string;
    }
  | {
      icon?: undefined;
      iconLabel?: undefined;
    };

export type HeaderProps = PropsWithChildren<
  {
    variant?: HeaderVariant;
    className?: string;
    iconClassName?: string;
    trail?: ReactNode;
  } & HeaderIconProps
>;

const headerStyles = tv({
  slots: {
    base: 'sticky top-3 z-50 mx-5 mt-2 flex min-h-12 items-center gap-3.5 rounded-2xl border bg-overlay/80 bg-linear-to-r px-3 py-2.5 shadow-[0_1px_2px_-0.5px_--theme(--box-shadow-color-default/3%),0_12px_28px_-10px_--theme(--box-shadow-color-default/6%),inset_0_2px_0_0_--theme(--box-shadow-color-edge/47.5%)] backdrop-blur-xl backdrop-saturate-150 transition-colors [--background-color-raised:var(--raised-on-tint)] [--raised-muted:var(--raised-on-tint-muted)] [--raised-subtle:var(--raised-on-tint-subtle)] sm:top-6',
    icon: '-my-1 -ml-5 flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-[0.6875rem] bg-accent-subtle text-accent shadow-xs ring-1 ring-accent-muted lg:w-auto lg:px-2.5',
    iconGlyph: 'h-4.5 w-4.5',
    iconLabelText:
      'hidden text-[0.8125rem] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap text-accent-strong/80 lg:block',
    trailRow:
      'relative z-40 mx-5 mt-8 hidden min-w-0 px-4 has-[nav]:flex md:mt-0',
    trailShelf: '-mb-1 flex min-w-0 items-center',
  },
  variants: {
    variant: {
      success: {
        base: 'border-success from-success-muted/90 from-0% via-surface/70 via-50% to-success-subtle/60',
      },
      danger: {
        base: 'border-danger from-danger-muted/90 from-0% via-surface/70 via-50% to-danger-subtle/60',
      },
      warning: {
        base: 'border-warning from-warning-muted/90 from-0% via-surface/70 via-50% to-warning-subtle/60',
      },
      pending: {
        base: 'border-pending from-pending-muted/90 from-0% via-surface/70 via-50% to-pending-subtle/60',
      },
      info: {
        base: 'border-info from-info-muted/90 from-0% via-surface/70 via-50% to-info-subtle/60',
      },
      default: {
        base: 'border-default from-muted/90 from-0% via-surface/70 via-50% to-subtle/60',
      },
    } satisfies Record<HeaderVariant, { base: string }>,
    hasIcon: {
      true: {},
      false: {},
    },
    hasTrail: {
      true: { base: 'mt-0' },
      false: {},
    },
  },
  defaultVariants: { variant: 'default', hasIcon: false, hasTrail: false },
});

export function Header({
  variant = 'default',
  icon,
  iconLabel,
  iconClassName,
  className,
  trail,
  children,
}: HeaderProps) {
  const hasTrail = trail !== undefined && trail !== null;
  const styles = headerStyles({ variant, hasIcon: Boolean(icon), hasTrail });
  return (
    <>
      {hasTrail && (
        <div data-header-trail className={styles.trailRow()}>
          <div className={styles.trailShelf()}>{trail}</div>
        </div>
      )}
      <header className={styles.base({ className })}>
        {icon && (
          <span role="img" aria-label={iconLabel} className={styles.icon()}>
            <Icon
              name={icon}
              className={styles.iconGlyph({ className: iconClassName })}
            />
            <span aria-hidden="true" className={styles.iconLabelText()}>
              {iconLabel}
            </span>
          </span>
        )}
        {children}
      </header>
    </>
  );
}
