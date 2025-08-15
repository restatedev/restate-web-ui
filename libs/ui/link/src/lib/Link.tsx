import { focusRing } from '@restate/ui/focus';
import { AriaAttributes, forwardRef, useMemo } from 'react';
import {
  Link as AriaLink,
  LinkProps as AriaLinkProps,
  composeRenderProps,
  PressEvent,
} from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { tv } from '@restate/util/styles';

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
  variant?:
    | 'primary'
    | 'secondary'
    | 'button'
    | 'secondary-button'
    | 'destructive-button'
    | 'icon';
  preserveQueryParams?: boolean;
  onClick?: (event: Omit<PressEvent, 'target'>) => void;
}

const styles = tv({
  extend: focusRing,
  base: 'rounded underline disabled:cursor-default disabled:no-underline',
  variants: {
    variant: {
      button:
        'inline-block rounded-xl border border-black/10 bg-linear-to-b from-blue-600/90 to-blue-600 px-5 py-2 text-center text-sm text-white no-underline shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] drop-shadow-xs hover:from-blue-700 hover:to-blue-700 hover:shadow-none pressed:from-blue-800 pressed:to-blue-800 pressed:shadow-none',
      'secondary-button':
        'inline-block rounded-xl border bg-white px-5 py-2 text-center text-sm text-gray-800 no-underline shadow-xs hover:bg-gray-100 pressed:bg-gray-200',
      'destructive-button':
        'inline-block rounded-xl border border-black/10 bg-linear-to-b from-red-700/95 to-red-700 px-5 py-2 text-center text-sm text-white no-underline shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] drop-shadow-xs hover:from-red-800 hover:to-red-800 hover:shadow-none pressed:from-red-900 pressed:to-red-900 pressed:shadow-none',
      primary:
        'text-blue-600 decoration-blue-600/60 hover:decoration-blue-600 dark:text-blue-500',
      secondary:
        'text-gray-700 decoration-gray-700/50 hover:decoration-gray-700 dark:text-zinc-300',
      icon: 'flex items-center justify-center border-0 p-1 text-gray-600 no-underline shadow-none hover:bg-black/5 disabled:bg-transparent pressed:bg-black/10',
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
            .replace(`${key}=${encodeURIComponent(value)}`, ''),
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
  ({ href, preserveQueryParams = true, onClick, ...props }, ref) => {
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
            styles({ ...renderProps, className, variant: props.variant }),
        )}
        onPress={onClick}
      />
    );
  },
);
