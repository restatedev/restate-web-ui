import { ClientActionFunctionArgs, useFetcher } from '@remix-run/react';
import { useState, useCallback } from 'react';

export function useFetcherWithError<
  TData extends (
    params: ClientActionFunctionArgs
  ) => Promise<{ errors?: Error[] } | any>
>({ key }: { key: string }) {
  const fetcher = useFetcher<TData>({ key });
  const [errors, setErrors] = useState<Error[]>();
  const [canUpdateErrors, setCanUpdateErrors] = useState(true);

  if (fetcher.state === 'submitting' && !canUpdateErrors) {
    setCanUpdateErrors(true);
  }
  if (fetcher.state === 'submitting' && errors) {
    setErrors(undefined);
  }
  if (
    fetcher.state === 'idle' &&
    errors !== fetcher.data?.errors &&
    canUpdateErrors
  ) {
    setErrors(fetcher.data?.errors);
  }

  const resetErrors = useCallback(() => {
    setCanUpdateErrors(false);
    setErrors(undefined);
  }, []);

  return { ...fetcher, errors, resetErrors };
}