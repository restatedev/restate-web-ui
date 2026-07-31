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
  } & HeaderIconProps
>;

const headerStyles = tv({
  slots: {
    base: 'sticky top-3 z-50 mx-5 mt-2 flex min-h-12 items-center gap-3.5 rounded-2xl border bg-linear-to-r px-3 py-3 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/3%),0_12px_28px_-10px_--theme(--color-zinc-800/6%),inset_0_2px_0_0_--theme(--color-white/47.5%)] backdrop-blur-xl backdrop-saturate-200 transition-colors sm:top-6',
    icon: 'absolute top-1/2 -left-1 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl border border-gray-200/90 bg-linear-to-br from-white via-white to-zinc-50 text-indigo-500/80 shadow-[0_2px_4px_-1px_--theme(--color-zinc-800/5%),0_14px_26px_-12px_--theme(--color-zinc-800/12.5%),inset_0_2px_0_0_--theme(--color-white/50%)]',
    iconBadge:
      'flex h-8 w-8 rotate-3 items-center justify-center rounded-lg bg-indigo-50/80 shadow-[0_2px_6px_-5px_--theme(--color-indigo-900/17.5%),inset_0_1px_0_0_--theme(--color-white/40%)] ring-1 ring-indigo-200/60',
    iconGlyph: 'h-4.5 w-4.5 -rotate-3',
  },
  variants: {
    variant: {
      success: {
        base: 'border-green-300/60 from-green-100 from-0% via-white via-50% to-green-50',
      },
      danger: {
        base: 'border-red-300/60 from-red-100 from-0% via-white via-50% to-red-50',
      },
      warning: {
        base: 'border-orange-300/60 from-orange-100 from-0% via-white via-50% to-orange-50',
      },
      pending: {
        base: 'border-amber-300/60 from-amber-100 from-0% via-white via-50% to-amber-50',
      },
      info: {
        base: 'border-blue-300/60 from-blue-100 from-0% via-white via-50% to-blue-50',
      },
      default: {
        base: 'border-gray-300/60 from-gray-100/80 from-0% via-gray-50 via-55% to-gray-100/70',
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
  className,
  children,
}: HeaderProps) {
  const styles = headerStyles({ variant, hasIcon: Boolean(icon) });
  return (
    <header className={styles.base({ className })}>
      {icon && (
        <span role="img" aria-label={iconLabel} className={styles.icon()}>
          <span className={styles.iconBadge()}>
            <Icon name={icon} className={styles.iconGlyph()} />
          </span>
        </span>
      )}
      {children}
    </header>
  );
}
