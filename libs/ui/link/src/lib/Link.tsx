import { focusRing } from '@restate/ui/focus';
import { AriaAttributes, forwardRef, useMemo } from 'react';
import {
  Link as AriaLink,
  LinkProps as AriaLinkProps,
  composeRenderProps,
} from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { tv } from 'tailwind-variants';

interface LinkProps
  extends Pick<
      AriaLinkProps,
      | 'autoFocus'
      | 'target'
      | 'rel'
      | 'className'
      | 'children'
      | 'href'
      | 'aria-label'
      | 'download'
    >,
    Pick<AriaAttributes, 'aria-current'> {
  className?: string;
  variant?: 'primary' | 'secondary' | 'button' | 'secondary-button' | 'icon';
  preserveQueryParams?: boolean;
}

const styles = tv({
  extend: focusRing,
  base: 'underline disabled:no-underline disabled:cursor-default transition rounded',
  variants: {
    variant: {
      button:
        'no-underline bg-gradient-to-b from-blue-600/90 to-blue-600 hover:from-blue-700 hover:to-blue-700 pressed:from-blue-800 pressed:to-blue-800 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] drop-shadow-sm hover:shadow-none pressed:shadow-none px-5 py-2 text-sm text-center transition rounded-xl border border-black/10',
      'secondary-button':
        'bg-white hover:bg-gray-100 pressed:bg-gray-200 text-gray-800 no-underline shadow-sm px-5 py-2 text-sm text-center transition rounded-xl border',
      primary:
        'text-blue-600 dark:text-blue-500 underline decoration-blue-600/60 hover:decoration-blue-600',
      secondary:
        'text-gray-700 dark:text-zinc-300 underline decoration-gray-700/50 hover:decoration-gray-700',
      icon: 'no-underline shadow-none border-0 p-1 flex items-center justify-center text-gray-600 hover:bg-black/[5%] pressed:bg-black/10 disabled:bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

export function useHrefWithQueryParams({
  preserveQueryParams,
  href,
  mode = 'prepend',
}: {
  preserveQueryParams: boolean;
  href?: string;
  mode?: 'append' | 'prepend';
}) {
  const [searchParams] = useSearchParams();

  const hrefWithQueryParams = useMemo(() => {
    if (preserveQueryParams && href?.startsWith('?')) {
      const [hrefParams, hash] = href.split('#');
      const newSearchParams = new URLSearchParams(hrefParams);
      let existingSearchParams = new URLSearchParams(searchParams);
      Array.from(newSearchParams.entries()).forEach(([key, value]) => {
        existingSearchParams = new URLSearchParams(
          existingSearchParams
            .toString()
            .replace(`${key}=${value}`, '')
            .replace(`${key}=${encodeURIComponent(value)}`, '')
        );
      });
      const combinedSearchParams = new URLSearchParams([
        ...(mode === 'prepend' ? newSearchParams : []),
        ...existingSearchParams,
        ...(mode === 'append' ? newSearchParams : []),
      ]);
      return '?' + combinedSearchParams.toString() + (hash ? `#${hash}` : '');
    } else {
      return href;
    }
  }, [preserveQueryParams, href, searchParams, mode]);
  return hrefWithQueryParams;
}
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, preserveQueryParams = true, ...props }, ref) => {
    const hrefWithQueryParams = useHrefWithQueryParams({
      href,
      preserveQueryParams,
    });

    return (
      <AriaLink
        {...props}
        href={hrefWithQueryParams}
        ref={ref}
        className={composeRenderProps(
          props.className,
          (className, renderProps) =>
            styles({ ...renderProps, className, variant: props.variant })
        )}
      />
    );
  }
);
