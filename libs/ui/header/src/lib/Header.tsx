import { Icon, type IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import type { PropsWithChildren } from 'react';

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
  } & HeaderIconProps
>;

const headerStyles = tv({
  slots: {
    base: 'sticky top-3 z-50 mx-5 mt-2 flex min-h-12 items-center gap-3.5 rounded-2xl border bg-linear-to-r px-3 py-2.5 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/3%),0_12px_28px_-10px_--theme(--color-zinc-800/6%),inset_0_2px_0_0_--theme(--color-white/47.5%)] backdrop-blur-xl backdrop-saturate-150 transition-colors sm:top-6',
    icon: 'absolute top-1/2 -left-2 flex h-15 w-15 -translate-y-1/2 items-center justify-center rounded-[1.125rem] border border-gray-200/90 bg-white text-indigo-500/80 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/6%),0_10px_22px_-10px_--theme(--color-zinc-800/14%),inset_0_2px_0_0_--theme(--color-white/60%)]',
    iconBadge:
      'flex h-9 w-9 rotate-3 items-center justify-center rounded-[0.625rem] bg-indigo-50 shadow-[inset_0_1px_0_0_--theme(--color-white/50%)] ring-1 ring-indigo-200/70',
    iconGlyph: 'h-5 w-5 -rotate-3',
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
      true: {
        base: 'pl-[4.25rem]',
      },
      false: {},
    },
  },
  defaultVariants: { variant: 'default', hasIcon: false },
});

export function Header({
  variant = 'default',
  icon,
  iconLabel,
  iconClassName,
  className,
  children,
}: HeaderProps) {
  const styles = headerStyles({ variant, hasIcon: Boolean(icon) });
  return (
    <header className={styles.base({ className })}>
      {icon && (
        <span className="inline-flex h-7 shrink-0 items-center rounded-[0.625rem] border border-zinc-300/60 bg-white/60 px-2 text-[0.5625rem] font-semibold tracking-[0.05em] text-zinc-500 uppercase shadow-xs">
          {iconLabel}
        </span>
      )}
      {icon && (
        <span role="img" aria-label={iconLabel} className={styles.icon()}>
          <span className={styles.iconBadge()}>
            <Icon
              name={icon}
              className={styles.iconGlyph({ className: iconClassName })}
            />
          </span>
        </span>
      )}
      {children}
    </header>
  );
}
