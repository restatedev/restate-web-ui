import { Icon, type IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
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
    base: 'sticky top-3 z-50 mx-5 mt-2 flex min-h-12 items-center gap-3.5 rounded-2xl border bg-linear-to-r px-3 py-2.5 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/3%),0_12px_28px_-10px_--theme(--color-zinc-800/6%),inset_0_2px_0_0_--theme(--color-white/47.5%)] backdrop-blur-xl backdrop-saturate-150 transition-colors sm:top-6',
    icon: '-my-1 -ml-5 flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-[0.6875rem] bg-blue-50/90 text-blue-600/90 shadow-xs ring-1 ring-blue-200/60 lg:w-auto lg:px-2.5',
    iconGlyph: 'h-4.5 w-4.5',
    iconLabelText:
      'hidden text-[0.8125rem] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap text-blue-900/75 lg:block',
    trailRow: 'relative z-40 mx-5 mt-8 hidden min-w-0 px-4 has-[nav]:flex md:mt-0',
    trailShelf: '-mb-1 flex min-w-0 items-center',
  },
  variants: {
    variant: {
      success: {
        base: 'border-green-300/60 from-green-100/90 from-0% via-white/75 via-50% to-green-50/60',
      },
      danger: {
        base: 'border-red-300/60 from-red-100/90 from-0% via-white/75 via-50% to-red-50/60',
      },
      warning: {
        base: 'border-orange-300/60 from-orange-100/90 from-0% via-white/75 via-50% to-orange-50/60',
      },
      pending: {
        base: 'border-amber-300/60 from-amber-100/90 from-0% via-white/75 via-50% to-amber-50/60',
      },
      info: {
        base: 'border-blue-300/60 from-blue-100/90 from-0% via-white/75 via-50% to-blue-50/60',
      },
      default: {
        base: 'border-gray-300/60 from-gray-100/90 from-0% via-white/75 via-50% to-gray-50/60',
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
