import {
  Children,
  ComponentType,
  createElement,
  FormEvent,
  ReactElement,
  ReactNode,
  useRef,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  ConfirmationDialog,
  ConfirmationDialogProps,
} from './ConfirmationDialog';
import {
  showCountdownNotification,
  showErrorNotification,
} from '@restate/ui/notification';
import {
  getUserPreference,
  setUserPreference,
  UserPreferenceId,
} from '@restate/features/user-preference';
import { FormFieldCheckbox, FormFieldLabel } from '@restate/ui/form-field';

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
  T extends any[] = any[],
> {
  shouldShowSkipConfirmation?: boolean;
  userPreferenceId: UserPreferenceId;
  queryParam: string;
  ToastCountDownMessage: ComponentType<{ formData: FormData }>;
  ToastErrorMessage: ComponentType<{ formData: FormData }>;
  useMutation: THook;
  getUseMutationInput: (input: URLSearchParams | FormData) => string | null;
  getQueryParamValue: (input: URLSearchParams | FormData) => string | null;
  getFormData: (...input: T) => FormData;
  onSubmit: (
    mutate: (variables: ExtractVariables<ExtractMutationResult<THook>>) => void,
    event: FormEvent<HTMLFormElement> | FormData,
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
    const mutationKey = config.getUseMutationInput(searchParams);

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
        {config.shouldShowSkipConfirmation ? (
          <FormFieldLabel className="mt-2 mb-0 flex w-full translate-y-1 flex-row gap-0.5 rounded-xl border bg-zinc-50 py-1.5 pr-1.5 pl-2 text-sm text-gray-600 [&:not(:has(:checked)):not(:has([data-pressed]))_.checkbox]:bg-white">
            <FormFieldCheckbox
              name={config.userPreferenceId}
              value="true"
              onChange={(value) => {
                setUserPreference(config.userPreferenceId, value);
              }}
              className=""
            />
            <div className="flex-auto font-normal">
              Skip this confirmation in the future
            </div>
          </FormFieldLabel>
        ) : undefined}
      </ConfirmationDialog>
    );
  }

  function Trigger<
    E extends ReactElement<{ href: string; onClick: VoidFunction }>,
  >(props: { children: E; formData: FormData }) {
    const element = Children.only(props.children);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const customHelpers = config.useHelpers?.();

    const mutationKey = config.getUseMutationInput(props.formData);

    const hideRef = useRef<VoidFunction>(null);
    const mutation = config.useMutation(mutationKey || '', {
      onSuccess: (
        data: ExtractData<ExtractMutationResult<THook>>,
        variables: ExtractVariables<ExtractMutationResult<THook>>,
        context: ExtractContext<ExtractMutationResult<THook>>,
      ) => {
        hideRef.current?.();
        config.onSuccess?.(data, variables, context, {
          navigate,
          searchParams,
          ...(customHelpers as THelpers),
        });
      },
      onError: () => {
        showErrorNotification(
          <config.ToastErrorMessage formData={props.formData} />,
        );
        hideRef.current?.();
      },
    });

    const shouldTriggerDialog = !getUserPreference(config.userPreferenceId);

    return createElement(element.type, {
      ...element.props,
      ...(shouldTriggerDialog
        ? {
            href: `?${config.queryParam}=${config.getQueryParamValue(props.formData) || 'true'}`,
          }
        : {
            onClick: () => {
              const { promise, hide } = showCountdownNotification(
                <config.ToastCountDownMessage formData={props.formData} />,
              );
              hideRef.current = hide;

              promise.then(() =>
                config.onSubmit(mutation.mutate, props.formData),
              );
            },
          }),
    });
  }

  return {
    Dialog,
    Trigger,
    getFormData: config.getFormData,
    hasFollowup: () => !getUserPreference(config.userPreferenceId),
  };
}
