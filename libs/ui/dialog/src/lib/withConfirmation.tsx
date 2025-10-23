import { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  ConfirmationDialog,
  ConfirmationDialogProps,
} from './ConfirmationDialog';

type UseMutationHook = (
  ...args: any[]
) => UseMutationResult<any, any, any, any>;

type ExtractMutationResult<T extends UseMutationHook> = ReturnType<T>;

type ExtractData<T> =
  T extends UseMutationResult<infer TData, any, any, any> ? TData : never;

type ExtractError<T> =
  T extends UseMutationResult<any, infer TError, any, any> ? TError : never;

type ExtractVariables<T> =
  T extends UseMutationResult<any, any, infer TVariables, any>
    ? TVariables
    : never;

type ExtractContext<T> =
  T extends UseMutationResult<any, any, any, infer TContext> ? TContext : never;

export interface WithConfirmationConfig<THook extends UseMutationHook> {
  queryParam: string;
  useMutation: THook;
  buildUseMutationInput: (searchParams: URLSearchParams) => string | null;
  onSubmit: (
    mutate: (variables: ExtractVariables<ExtractMutationResult<THook>>) => void,
    event: FormEvent<HTMLFormElement>,
  ) => void;
  renderDialog: (
    searchParams: URLSearchParams,
  ) => Omit<
    ConfirmationDialogProps,
    'queryParam' | 'onSubmit' | 'isPending' | 'error' | 'onReset'
  >;
  onSuccess?: (
    data: ExtractData<ExtractMutationResult<THook>>,
    variables: ExtractVariables<ExtractMutationResult<THook>>,
    context: ExtractContext<ExtractMutationResult<THook>>,
  ) => void;
  onError?: (
    error: ExtractError<ExtractMutationResult<THook>>,
    variables: ExtractVariables<ExtractMutationResult<THook>>,
    context: ExtractContext<ExtractMutationResult<THook>>,
  ) => void;
}

export function withConfirmation<THook extends UseMutationHook>(
  config: WithConfirmationConfig<THook>,
) {
  function Dialog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const mutationKey = config.buildUseMutationInput(searchParams);

    const mutation = config.useMutation(mutationKey || '', {
      onSuccess: (
        data: ExtractData<ExtractMutationResult<THook>>,
        variables: ExtractVariables<ExtractMutationResult<THook>>,
        context: ExtractContext<ExtractMutationResult<THook>>,
      ) => {
        setSearchParams(
          (old) => {
            old.delete(config.queryParam);
            return old;
          },
          { preventScrollReset: true },
        );
        config.onSuccess?.(data, variables, context);
      },
      onError: config.onError,
    });

    const { mutate, isPending, error, reset } = mutation;

    const dialogConfig = config.renderDialog(searchParams);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      config.onSubmit(mutate, event);
    };

    return (
      <ConfirmationDialog
        queryParam={config.queryParam}
        {...dialogConfig}
        onSubmit={handleSubmit}
        isPending={isPending}
        error={error as Error | null}
        onClode={reset}
      />
    );
  }

  function getTriggerHref(value?: string) {
    return `?${config.queryParam}=${value || 'true'}`;
  }

  return { Dialog, getTriggerHref };
}
