import {
  useRef,
  type PropsWithChildren,
  useDeferredValue,
  ComponentProps,
} from 'react';
import { useFetchers, useHref } from '@remix-run/react';
import { Button } from './Button';
import { tv } from 'tailwind-variants';
import { useIsMutating } from '@tanstack/react-query';

export interface SubmitButtonProps {
  onClick?: VoidFunction;
  name?: string;
  form?: string;
  disabled?: boolean;
  value?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon';
  className?: string;
  autoFocus?: boolean;
  hideSpinner?: boolean;
}

const spinnerStyles = tv({
  base: 'animate-spin h-5 w-5',
});
export const Spinner = ({
  className,
  style,
}: {
  className?: string;
  style?: ComponentProps<'svg'>['style'];
}) => (
  <svg
    className={spinnerStyles({ className })}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    style={style}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className=""
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 2.21.895 4.21 2.344 5.657l2.217-2.123z"
    ></path>
  </svg>
);

const styles = tv({
  base: 'flex items-center justify-center gap-2',
});

function useIsSubmitting(action?: string) {
  const basename = useHref('/');
  let actionUrl: URL | null = null;
  try {
    actionUrl = new URL(String(action));
  } catch {
    actionUrl = null;
  }
  const formActionPathname = actionUrl?.pathname
    .split(basename.replace(/\/$/, ''))
    .at(-1);
  const fetchers = useFetchers();
  const submitFetcher = fetchers.find(
    (fetcher) => fetcher.formAction === formActionPathname
  );

  const isMutating = useIsMutating({
    predicate: (mutation) => {
      const [pathName] = mutation.options.mutationKey ?? [];
      return formActionPathname === pathName;
    },
  });

  return submitFetcher?.state === 'submitting' || isMutating > 0;
}

export function SubmitButton({
  disabled,
  children,
  hideSpinner = false,
  ...props
}: PropsWithChildren<SubmitButtonProps>) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const formElement = ref.current?.form;
  const isSubmitting = useIsSubmitting(formElement?.action);
  const deferredIsSubmitting = useDeferredValue(isSubmitting);

  return (
    <Button
      {...props}
      type="submit"
      ref={ref}
      disabled={deferredIsSubmitting || disabled}
    >
      {deferredIsSubmitting && !hideSpinner ? (
        <div className={styles({})}>
          <Spinner />
          {children}
        </div>
      ) : (
        children
      )}
    </Button>
  );
}
