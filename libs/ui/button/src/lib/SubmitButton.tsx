import { useRef, type PropsWithChildren } from 'react';
import { useFetchers } from '@remix-run/react';
import { Button } from './Button';
import { tv } from 'tailwind-variants';

export interface SubmitButtonProps {
  onClick?: VoidFunction;
  name?: string;
  form?: string;
  disabled?: boolean;
  value?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'icon';
  className?: string;
}

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 "
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
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

export function SubmitButton({
  disabled,
  children,
  ...props
}: PropsWithChildren<SubmitButtonProps>) {
  const fetchers = useFetchers();
  const ref = useRef<HTMLButtonElement | null>(null);
  const formElement = ref.current?.form;
  const submitFetcher = fetchers.find((fetcher) => {
    if (formElement?.action) {
      try {
        const actionUrl = new URL(formElement.action);
        return fetcher.formAction === actionUrl.pathname;
      } catch (error) {
        return false;
      }
    }
    return false;
  });
  const isSubmitting = submitFetcher?.state === 'submitting';

  return (
    <Button
      {...props}
      type="submit"
      ref={ref}
      disabled={isSubmitting || disabled}
    >
      {isSubmitting ? (
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
