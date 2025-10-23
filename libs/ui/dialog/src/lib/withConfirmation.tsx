import { ComponentType, FormEvent, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  ConfirmationDialog,
  ConfirmationDialogProps,
} from './ConfirmationDialog';

export interface BaseHelpers {
  navigate: ReturnType<typeof useNavigate>;
  searchParams: URLSearchParams;
}

export type WithHelpers<T = object> = BaseHelpers & T;

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

export interface WithConfirmationConfig<
  THook extends UseMutationHook,
  THelpers = object,
> {
  queryParam: string;
  useMutation: THook;
  buildUseMutationInput: (searchParams: URLSearchParams) => string | null;
  onSubmit: (
    mutate: (variables: ExtractVariables<ExtractMutationResult<THook>>) => void,
    event: FormEvent<HTMLFormElement>,
  ) => void;
  title: string;
  description: ReactNode;
  submitText?: string;
  icon?: ConfirmationDialogProps['icon'];
  iconClassName?: string;
  alertType?: ConfirmationDialogProps['alertType'];
  alertContent?: ReactNode;
  submitVariant?: ConfirmationDialogProps['submitVariant'];
  formMethod?: ConfirmationDialogProps['formMethod'];
  formAction?: string;
  Content?: ComponentType;
  useHelpers?: () => THelpers;
  onSuccess?: (
    data: ExtractData<ExtractMutationResult<THook>>,
    variables: ExtractVariables<ExtractMutationResult<THook>>,
    context: ExtractContext<ExtractMutationResult<THook>>,
    helpers: WithHelpers<THelpers>,
  ) => void;
  onError?: (
    error: ExtractError<ExtractMutationResult<THook>>,
    variables: ExtractVariables<ExtractMutationResult<THook>>,
    context: ExtractContext<ExtractMutationResult<THook>>,
  ) => void;
}

export function withConfirmation<
  THook extends UseMutationHook,
  THelpers = object,
>(config: WithConfirmationConfig<THook, THelpers>) {
  function Dialog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const customHelpers = config.useHelpers?.();
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
        config.onSuccess?.(data, variables, context, {
          navigate,
          searchParams,
          ...(customHelpers as THelpers),
        });
      },
      onError: config.onError,
    });

    const { mutate, isPending, error, reset } = mutation;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      config.onSubmit(mutate, event);
    };

    const ContentComponent = config.Content;

    return (
      <ConfirmationDialog
        queryParam={config.queryParam}
        title={config.title}
        description={config.description}
        submitText={config.submitText ?? 'Submit'}
        icon={config.icon}
        iconClassName={config.iconClassName}
        alertType={config.alertType}
        alertContent={config.alertContent}
        submitVariant={config.submitVariant}
        formMethod={config.formMethod}
        formAction={config.formAction}
        onSubmit={handleSubmit}
        isPending={isPending}
        error={error as Error | null}
        onClose={reset}
      >
        {ContentComponent && <ContentComponent />}
      </ConfirmationDialog>
    );
  }

  function getTriggerProps(value?: string) {
    return {
      href: `?${config.queryParam}=${value || 'true'}`,
    };
  }

  return { Dialog, getTriggerProps };
}
