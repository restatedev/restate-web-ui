import { useRef, type PropsWithChildren, useDeferredValue } from 'react';
import { useFetchers, useHref, useNavigation } from 'react-router';
import { Button } from './Button';
import { tv } from 'tailwind-variants';
import { useIsMutating } from '@tanstack/react-query';
import { Spinner } from '@restate/ui/loading';

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
  isPending?: boolean;
}

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
  const formActionPathname =
    basename === '/'
      ? actionUrl?.pathname
      : actionUrl?.pathname.split(basename.replace(/\/$/, '')).at(-1);
  const fetchers = useFetchers();
  const submitFetcher = fetchers.find(
    (fetcher) => fetcher.formAction === formActionPathname,
  );

  const isMutating = useIsMutating({
    predicate: (mutation) => {
      const [pathName] = mutation.options.mutationKey ?? [];
      return formActionPathname === pathName;
    },
  });
  const { state } = useNavigation();

  return (
    submitFetcher?.state === 'submitting' || isMutating > 0 || state !== 'idle'
  );
}

export function SubmitButton({
  disabled,
  children,
  hideSpinner = false,
  isPending,
  ...props
}: PropsWithChildren<SubmitButtonProps>) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const formElement = ref.current?.form;
  const isSubmitting =
    useIsSubmitting(formElement?.action) || Boolean(isPending);
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
