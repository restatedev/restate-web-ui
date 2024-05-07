import { focusRing } from '@restate/ui/focus';
import { AriaAttributes, forwardRef } from 'react';
import {
  Link as AriaLink,
  LinkProps as AriaLinkProps,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from 'tailwind-variants';

interface LinkProps
  extends Pick<
      AriaLinkProps,
      'autoFocus' | 'target' | 'rel' | 'className' | 'children' | 'href'
    >,
    Pick<AriaAttributes, 'aria-current'> {
  variant?: 'primary' | 'secondary' | 'button';
}

const styles = tv({
  extend: focusRing,
  base: 'underline disabled:no-underline disabled:cursor-default forced-colors:disabled:text-[GrayText] transition rounded',
  variants: {
    variant: {
      button:
        'no-underline bg-blue-600 hover:bg-blue-700 pressed:bg-blue-800 text-white shadow-sm px-5 py-2 text-sm text-center transition rounded-xl border border-black/10',
      primary:
        'text-blue-600 dark:text-blue-500 underline decoration-blue-600/60 hover:decoration-blue-600 dark:decoration-blue-500/60 dark:hover:decoration-blue-500',
      secondary:
        'text-gray-700 dark:text-zinc-300 underline decoration-gray-700/50 hover:decoration-gray-700 dark:decoration-zinc-300/70 dark:hover:decoration-zinc-300',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  return (
    <AriaLink
      {...props}
      ref={ref}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className, variant: props.variant })
      )}
    />
  );
});
