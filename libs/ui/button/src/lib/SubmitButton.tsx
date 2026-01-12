import {
  type PropsWithChildren,
  RefObject,
  useCallback,
  useDeferredValue,
  useState,
} from 'react';
import { useFetchers, useHref, useNavigation } from 'react-router';
import { Button } from './Button';
import { tv } from '@restate/util/styles';
import { useIsMutating } from '@tanstack/react-query';
import { Spinner } from '@restate/ui/loading';
import { mergeRefs, useObjectRef } from '@react-aria/utils';

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
  ref?: RefObject<HTMLButtonElement | null>;
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
      ? String(actionUrl?.pathname) + actionUrl?.search
      : String(actionUrl?.pathname.split(basename.replace(/\/$/, '')).at(-1)) +
        actionUrl?.search;
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
  ref,
  ...props
}: PropsWithChildren<SubmitButtonProps>) {
  const [action, setAction] = useState<string>();
  const isSubmitting = useIsSubmitting(action) || Boolean(isPending);
  const deferredIsSubmitting = useDeferredValue(isSubmitting);
  const setFormAction = useCallback((el: HTMLButtonElement | null) => {
    setAction(el?.form?.action);
  }, []);
  const buttonRefObject = useObjectRef(mergeRefs(setFormAction, ref));

  return (
    <Button
      {...props}
      type="submit"
      ref={buttonRefObject}
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
