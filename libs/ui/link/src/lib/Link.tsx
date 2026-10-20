import { focusRing } from '@restate/ui-focus';
import { AriaAttributes, forwardRef, useMemo } from 'react';
import {
  Link as AriaLink,
  LinkProps as AriaLinkProps,
  composeRenderProps,
  PressEvent,
} from 'react-aria-components';
import { useSearchParams, type NavigateOptions } from 'react-router';
import { tv } from '@restate/util-styles';

declare module 'react-aria-components' {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

interface LinkProps
  extends
    Pick<
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
  preserveQueryParams?: boolean | string[];
  onClick?: (event: Omit<PressEvent, 'target'>) => void;
  disabled?: boolean;
}

const styles = tv({
  extend: focusRing,
  base: 'rounded underline disabled:cursor-default disabled:no-underline',
  variants: {
    variant: {
      button:
        'inline-block rounded-xl border border-tint bg-linear-to-b from-accent/90 to-accent px-5 py-2 text-center text-sm text-inverse no-underline shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/20%)] drop-shadow-xs hover:from-accent-hover hover:to-accent-hover hover:shadow-none pressed:from-accent-pressed pressed:to-accent-pressed pressed:shadow-none',
      'secondary-button':
        'inline-block rounded-xl border bg-raised px-5 py-2 text-center text-sm text-primary no-underline shadow-xs hover:bg-raised-hover pressed:bg-raised-pressed',
      'destructive-button':
        'inline-block rounded-xl border border-tint bg-linear-to-b from-danger/95 to-danger px-5 py-2 text-center text-sm text-inverse no-underline shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/15%)] drop-shadow-xs hover:from-danger-hover hover:to-danger-hover hover:shadow-none pressed:from-danger-pressed pressed:to-danger-pressed pressed:shadow-none',
      primary: 'text-accent decoration-accent/60 hover:decoration-accent',
      secondary:
        'text-secondary decoration-secondary/50 hover:decoration-secondary',
      icon: 'flex items-center justify-center border-0 p-1 text-tertiary no-underline shadow-none hover:bg-tint disabled:bg-transparent pressed:bg-tint-strong',
    },
  },
  defaultVariants: {
    variant: 'primary',
  },
});

interface HrefWithQueryParamsOptions {
  preserveQueryParams: boolean | string[];
  href: string;
  searchParams: URLSearchParams;
}

export function getHrefWithQueryParams({
  preserveQueryParams,
  href,
  searchParams,
}: HrefWithQueryParamsOptions): string {
  if (Array.isArray(preserveQueryParams)) {
    if (preserveQueryParams.length === 0) return href;
    const allowed = new Set(preserveQueryParams);
    const preserved = new URLSearchParams();
    for (const [k, v] of searchParams) {
      if (allowed.has(k)) preserved.append(k, v);
    }
    if (preserved.toString() === '') return href;

    const [pathPart = '', hashPart] = href.split('#');
    const [pathOnly = '', queryPart = ''] = pathPart.split('?');
    const hrefParams = new URLSearchParams(queryPart);
    const combined = new URLSearchParams();
    preserved.forEach((v, k) => {
      if (!hrefParams.has(k)) combined.append(k, v);
    });
    hrefParams.forEach((v, k) => combined.append(k, v));
    const queryStr = combined.toString();
    return (
      pathOnly +
      (queryStr ? '?' + queryStr : '') +
      (hashPart ? '#' + hashPart : '')
    );
  }

  if (preserveQueryParams && href.startsWith('?')) {
    const [hrefParams, hash] = href.split('#');
    const newSearchParams = new URLSearchParams(hrefParams);
    const combinedSearchParams = new URLSearchParams(searchParams);
    newSearchParams.forEach((_, key) => combinedSearchParams.delete(key));
    newSearchParams.forEach((value, key) => {
      if (value !== '') {
        combinedSearchParams.append(key, value);
      }
    });
    return '?' + combinedSearchParams.toString() + (hash ? `#${hash}` : '');
  }
  return href;
}

export function useHrefWithQueryParams({
  preserveQueryParams,
  href,
}: {
  preserveQueryParams: boolean | string[];
  href?: string;
}) {
  const [searchParams] = useSearchParams();

  const hrefWithQueryParams = useMemo(
    () =>
      href
        ? getHrefWithQueryParams({
            preserveQueryParams,
            href,
            searchParams,
          })
        : href,
    [preserveQueryParams, href, searchParams],
  );
  return hrefWithQueryParams;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, preserveQueryParams = true, onClick, disabled, ...props }, ref) => {
    const hrefWithQueryParams = useHrefWithQueryParams({
      href,
      preserveQueryParams,
    });

    return (
      <AriaLink
        {...props}
        isDisabled={disabled}
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
