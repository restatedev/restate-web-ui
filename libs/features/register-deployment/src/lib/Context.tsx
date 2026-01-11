import { Form, useSearchParams } from 'react-router';
import {
  createContext,
  FormEvent,
  PropsWithChildren,
  useCallback,
  useContext,
  useId,
  useReducer,
  useRef,
} from 'react';
import { ListData, useListData } from 'react-stately';
import * as adminApi from '@restate/data-access/admin-api/spec';
import { getEndpoint } from '@restate/data-access/admin-api';
import { useDialog } from '@restate/ui/dialog';
import { showSuccessNotification } from '@restate/ui/notification';
import { RestateError } from '@restate/util/errors';
import {
  useListDeployments,
  useRegisterDeployment,
  useUpdateDeployment,
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { useOnboarding } from '@restate/util/feature-flag';
import { addProtocol, FIX_HTTP_ACTION, getTargetType } from './utils';
import { UPDATE_DEPLOYMENT_QUERY } from './constant';

type NavigateToAdvancedAction = {
  type: 'NavigateToAdvancedAction';
};

type NavigateToConfirmAction = {
  type: 'NavigateToConfirmAction';
};

type NavigateToEndpointAction = {
  type: 'NavigateToEndpointAction';
};
type UpdateEndpointAction = {
  type: 'UpdateEndpointAction';
  payload: Pick<
    DeploymentRegistrationContextInterface,
    'endpoint' | 'isLambda' | 'isDuplicate' | 'isTunnel' | 'tunnelName'
  >;
};
type UpdateRoleArnAction = {
  type: 'UpdateRoleArnAction';
  payload: Pick<DeploymentRegistrationContextInterface, 'assumeRoleArn'>;
};
type UpdateUseHttp11Action = {
  type: 'UpdateUseHttp11Action';
  payload: Pick<DeploymentRegistrationContextInterface, 'useHttp11'>;
};
type UpdateServicesActions = {
  type: 'UpdateServicesActions';
  payload: Pick<
    DeploymentRegistrationContextInterface,
    'services' | 'sdk_version' | 'min_protocol_version' | 'max_protocol_version'
  >;
};
type UpdateShouldForce = {
  type: 'UpdateShouldForce';
  payload: Pick<DeploymentRegistrationContextInterface, 'shouldForce'>;
};
type UpdateShouldAllowBreaking = {
  type: 'UpdateShouldAllowBreaking';
  payload: Pick<
    DeploymentRegistrationContextInterface,
    'shouldAllowBreakingChange'
  >;
};

type Action =
  | NavigateToAdvancedAction
  | NavigateToConfirmAction
  | NavigateToEndpointAction
  | UpdateEndpointAction
  | UpdateRoleArnAction
  | UpdateUseHttp11Action
  | UpdateServicesActions
  | UpdateShouldForce
  | UpdateShouldAllowBreaking;

interface DeploymentRegistrationContextInterface {
  endpoint?: string;
  tunnelName: string;
  stage: 'endpoint' | 'advanced' | 'confirm';
  assumeRoleArn?: string;
  useHttp11?: boolean;
  isLambda: boolean;
  isTunnel: boolean;
  formId?: string;
  additionalHeaders?: ListData<{
    key: string;
    value: string;
    index: number;
  }>;
  metadata?: ListData<{
    key: string;
    value: string;
    index: number;
  }>;
  isPending?: boolean;
  isDuplicate?: boolean;
  shouldForce?: boolean;
  shouldAllowBreakingChange?: boolean;
  services?: adminApi.components['schemas']['ServiceMetadata'][];
  min_protocol_version?: adminApi.components['schemas']['DeploymentResponse']['min_protocol_version'];
  max_protocol_version?: adminApi.components['schemas']['DeploymentResponse']['max_protocol_version'];
  sdk_version?: adminApi.components['schemas']['DeploymentResponse']['sdk_version'];
  goToEndpoint?: VoidFunction;
  goToAdvanced?: VoidFunction;
  goToConfirm?: VoidFunction;
  updateEndpoint?: (value: UpdateEndpointAction['payload']) => void;
  register?: (isDryRun: boolean) => void;
  updateAssumeRoleArn?: (value: string) => void;
  updateUseHttp11Arn?: (value: boolean) => void;
  updateShouldForce?: (value: boolean) => void;
  updateShouldAllowBreakingChange?: (value: boolean) => void;
  error: RestateError | Error | null | undefined;
  mode: 'update' | 'register';
}

type State = Pick<
  DeploymentRegistrationContextInterface,
  | 'endpoint'
  | 'isLambda'
  | 'tunnelName'
  | 'isTunnel'
  | 'stage'
  | 'services'
  | 'assumeRoleArn'
  | 'useHttp11'
  | 'shouldForce'
  | 'isDuplicate'
  | 'shouldAllowBreakingChange'
  | 'mode'
>;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NavigateToAdvancedAction':
      return { ...state, stage: 'advanced' };
    case 'NavigateToConfirmAction':
      return { ...state, stage: 'confirm' };
    case 'NavigateToEndpointAction':
      return { ...state, stage: 'endpoint' };
    case 'UpdateEndpointAction':
      return {
        ...state,
        ...action.payload,
        ...(state.mode === 'register' && {
          shouldForce: false,
          shouldAllowBreakingChange: false,
        }),
      };
    case 'UpdateRoleArnAction':
      return { ...state, assumeRoleArn: action.payload.assumeRoleArn };
    case 'UpdateUseHttp11Action':
      return { ...state, useHttp11: action.payload.useHttp11 };
    case 'UpdateServicesActions':
      return { ...state, ...action.payload };
    case 'UpdateShouldForce':
      return { ...state, shouldForce: action.payload.shouldForce };
    case 'UpdateShouldAllowBreaking':
      return {
        ...state,
        shouldAllowBreakingChange: action.payload.shouldAllowBreakingChange,
      };

    default:
      return state;
  }
}

const initialState: (args: {
  endpoint?: string;
  deployments?: adminApi.Deployment[];
  mode: 'update' | 'register';
  assumeRoleArn?: string;
}) => DeploymentRegistrationContextInterface = (args) => {
  const endpoint = args?.endpoint;
  const isTunnel = endpoint?.startsWith('tunnel://');
  const isLambda = endpoint?.startsWith('arn:');
  const isEndpointValid =
    (!isLambda && !isTunnel && endpoint && endpoint !== 'true') ||
    isLambda ||
    isTunnel;
  const resolvedEndpoint = isTunnel
    ? ''
    : isLambda
      ? String(endpoint)
      : addProtocol(String(endpoint));
  return {
    stage: 'endpoint',
    isLambda: false,
    isTunnel: false,
    error: null,
    endpoint: '',
    tunnelName: '',
    mode: args?.mode,
    ...(isEndpointValid && {
      endpoint: resolvedEndpoint,
      isLambda,
      isDuplicate: args?.deployments?.some(
        (deployment) =>
          endpoint &&
          withoutTrailingSlash(getEndpoint(deployment)) ===
            withoutTrailingSlash(resolvedEndpoint),
      ),
      isTunnel,
      tunnelName: isTunnel ? String(endpoint)?.replace('tunnel://', '') : '',
    }),
    assumeRoleArn: args?.assumeRoleArn,
  };
};
const DeploymentRegistrationContext =
  createContext<DeploymentRegistrationContextInterface>(
    initialState({ mode: 'register' }),
  );

function withoutTrailingSlash(url?: string) {
  return url?.endsWith('/') ? url.slice(0, -1) : url;
}

export function DeploymentRegistrationState({
  children,
  initialEndpoint,
  mode,
  additionalHeaders: initialAdditionalHeaders,
  initialAssumeRoleArn,
}: PropsWithChildren<{
  initialEndpoint?: string;
  initialAssumeRoleArn?: string;
  mode: 'update' | 'register';
  additionalHeaders?: Record<string, string>;
}>) {
  const id = useId();
  const { tunnel } = useRestateContext();
  const formRef = useRef<HTMLFormElement>(null);
  const { refetch, data: listDeployments } = useListDeployments();
  const [searchParams] = useSearchParams();
  const [state, dispatch] = useReducer(
    reducer,
    {
      deployments: Array.from(listDeployments?.deployments.values() ?? []),
      endpoint: initialEndpoint,
      mode,
      assumeRoleArn: initialAssumeRoleArn,
    },
    initialState,
  );

  const additionalHeaders = useListData<{
    key: string;
    value: string;
    index: number;
  }>({
    initialItems: [
      ...Object.entries(initialAdditionalHeaders ?? {}).map(
        ([key, value], index) => ({ key, value, index }),
      ),
      {
        key: '',
        value: '',
        index: Object.keys(initialAdditionalHeaders ?? {}).length,
      },
    ],
    getKey: (item) => item.index,
  });

  const metadataList = useListData<{
    key: string;
    value: string;
    index: number;
  }>({
    initialItems: [{ key: '', value: '', index: 0 }],
    getKey: (item) => item.index,
  });
  const { close } = useDialog();
  const goToAdvanced = useCallback(() => {
    dispatch({ type: 'NavigateToAdvancedAction' });
  }, []);
  const goToEndpoint = useCallback(() => {
    dispatch({ type: 'NavigateToEndpointAction' });
  }, []);
  const goToConfirm = useCallback(() => {
    dispatch({ type: 'NavigateToConfirmAction' });
  }, []);

  const updateServices = useCallback(
    ({
      services,
      min_protocol_version,
      max_protocol_version,
      sdk_version,
    }: Pick<
      DeploymentRegistrationContextInterface,
      | 'services'
      | 'sdk_version'
      | 'min_protocol_version'
      | 'max_protocol_version'
    >) => {
      dispatch({
        type: 'UpdateServicesActions',
        payload: {
          services,
          min_protocol_version,
          max_protocol_version,
          sdk_version,
        },
      });
    },
    [],
  );
  const updateShouldForce = useCallback(
    (shouldForce: DeploymentRegistrationContextInterface['shouldForce']) => {
      dispatch({ type: 'UpdateShouldForce', payload: { shouldForce } });
    },
    [],
  );
  const updateShouldAllowBreakingChange = useCallback(
    (
      shouldAllowBreakingChange: DeploymentRegistrationContextInterface['shouldAllowBreakingChange'],
    ) => {
      dispatch({
        type: 'UpdateShouldAllowBreaking',
        payload: { shouldAllowBreakingChange },
      });
    },
    [],
  );

  const register = useRegisterDeployment({
    retryWithHttp1: state.stage !== 'confirm' && !state.useHttp11,
    onSuccess(data) {
      updateServices({
        services: data?.services,
        max_protocol_version: data?.max_protocol_version,
        min_protocol_version: data?.min_protocol_version,
        sdk_version: data?.sdk_version,
      });

      if (state.stage === 'confirm') {
        refetch();
        close?.();
        showSuccessNotification(
          <>
            <code>{data?.id}</code> has been successfully registered.
          </>,
        );
      } else {
        goToConfirm();
      }
    },
  });
  const update = useUpdateDeployment(
    searchParams.get(UPDATE_DEPLOYMENT_QUERY) || '',
    {
      retryWithHttp1: state.stage !== 'confirm' && !state.useHttp11,
      onSuccess(data) {
        updateServices({
          services: data?.services,
          max_protocol_version: data?.max_protocol_version,
          min_protocol_version: data?.min_protocol_version,
          sdk_version: data?.sdk_version,
        });

        if (state.stage === 'confirm') {
          refetch();
          close?.();
          showSuccessNotification(
            <>
              <code>{data?.id}</code> has been successfully updated.
            </>,
          );
        } else {
          goToConfirm();
        }
      },
    },
  );

  const isUpdate = mode === 'update';
  const isPending = isUpdate ? update.isPending : register.isPending;
  const error = isUpdate ? update.error : register.error;
  const reset = isUpdate ? update.reset : register.reset;

  const toHttp = tunnel?.toHttp;
  const updateEndpoint = useCallback(
    (value: UpdateEndpointAction['payload']) => {
      reset();
      let resolvedEndpoint = value.endpoint;
      if (value.isTunnel && value.endpoint) {
        try {
          resolvedEndpoint = toHttp?.(value.tunnelName, value.endpoint);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          /* empty */
        }
      }
      if (!value.isLambda && !value.isTunnel && value.endpoint) {
        resolvedEndpoint = addProtocol(value.endpoint);
      }
      if (
        mode === 'register' &&
        (state.isLambda !== value.isLambda || state.isTunnel !== value.isTunnel)
      ) {
        formRef.current?.reset();
      }
      const isDuplicate = Array.from(
        listDeployments?.deployments.values() ?? [],
      ).some(
        (deployment) =>
          withoutTrailingSlash(getEndpoint(deployment)) ===
          withoutTrailingSlash(resolvedEndpoint),
      );

      dispatch({
        type: 'UpdateEndpointAction',
        payload: {
          isTunnel: value.isTunnel,
          isLambda: value.isLambda,
          endpoint: value.endpoint,
          isDuplicate,
          tunnelName: value.tunnelName,
        },
      });
    },
    [
      reset,
      state.isLambda,
      state.isTunnel,
      listDeployments?.deployments,
      toHttp,
    ],
  );
  const updateAssumeRoleArn = useCallback(
    (assumeRoleArn: string) => {
      reset();
      dispatch({ type: 'UpdateRoleArnAction', payload: { assumeRoleArn } });
    },
    [reset],
  );
  const updateUseHttp11Arn = useCallback(
    (useHttp11: boolean) => {
      reset();
      dispatch({ type: 'UpdateUseHttp11Action', payload: { useHttp11 } });
    },
    [reset],
  );

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement;
    const action = submitter.value;
    const {
      endpoint = '',
      isLambda,
      assumeRoleArn,
      useHttp11,
      shouldForce,
      isTunnel,
      tunnelName,
      shouldAllowBreakingChange,
    } = state;

    if (action === FIX_HTTP_ACTION) {
      updateUseHttp11Arn(true);
    }
    if (action === 'advanced') {
      goToAdvanced();
      return;
    }

    const additional_headers: Record<string, string> =
      additionalHeaders.items.reduce((result, { key, value }) => {
        if (typeof key === 'string' && typeof value === 'string' && key) {
          return { ...result, [key]: value };
        }
        return result;
      }, {});

    const metadata: Record<string, string> = metadataList.items.reduce(
      (result, { key, value }) => {
        if (typeof key === 'string' && typeof value === 'string' && key) {
          return { ...result, [key]: value };
        }
        return result;
      },
      {},
    );
    if (mode === 'update') {
      update.mutate({
        body: {
          ...(isLambda
            ? { arn: endpoint, assume_role_arn: assumeRoleArn }
            : isTunnel
              ? {
                  uri: tunnel
                    ? String(tunnel.toHttp(tunnelName, endpoint))
                    : endpoint,
                  use_http_11: false,
                }
              : {
                  uri: addProtocol(endpoint),
                  use_http_11: Boolean(useHttp11) || action === FIX_HTTP_ACTION,
                }),
          overwrite: Boolean(shouldForce),
          dry_run: action === 'dryRun' || action === FIX_HTTP_ACTION,
          additional_headers,
        },
      });
    } else {
      register.mutate({
        body: {
          ...(isLambda
            ? { arn: endpoint, assume_role_arn: assumeRoleArn }
            : isTunnel
              ? {
                  uri: tunnel
                    ? String(tunnel.toHttp(tunnelName, endpoint))
                    : endpoint,
                  use_http_11: false,
                }
              : {
                  uri: addProtocol(endpoint),
                  use_http_11: Boolean(useHttp11) || action === FIX_HTTP_ACTION,
                }),
          force: Boolean(shouldForce),
          dry_run: action === 'dryRun' || action === FIX_HTTP_ACTION,
          additional_headers,
          breaking: Boolean(shouldAllowBreakingChange),
          metadata,
        },
      });
    }
  };

  return (
    <DeploymentRegistrationContext.Provider
      value={{
        ...state,
        goToAdvanced,
        goToConfirm,
        goToEndpoint,
        updateEndpoint,
        formId: id,
        additionalHeaders,
        updateAssumeRoleArn,
        updateUseHttp11Arn,
        updateShouldForce,
        updateShouldAllowBreakingChange,
        error,
        isPending,
        metadata: metadataList,
      }}
    >
      <Form
        id={id}
        method={isUpdate ? 'patch' : 'post'}
        action={
          isUpdate
            ? `/deployments/${searchParams.get(UPDATE_DEPLOYMENT_QUERY)}`
            : '/deployments'
        }
        ref={formRef}
        onSubmit={submitHandler}
      >
        {children}
      </Form>
    </DeploymentRegistrationContext.Provider>
  );
}

export function useRegisterDeploymentContext() {
  const {
    stage,
    endpoint,
    isLambda,
    goToAdvanced,
    goToConfirm,
    goToEndpoint,
    updateEndpoint,
    formId,
    additionalHeaders,
    services,
    updateAssumeRoleArn,
    updateUseHttp11Arn,
    updateShouldForce,
    updateShouldAllowBreakingChange,
    shouldAllowBreakingChange,
    shouldForce,
    useHttp11,
    assumeRoleArn,
    error,
    isPending,
    isDuplicate,
    max_protocol_version,
    min_protocol_version,
    sdk_version,
    isTunnel,
    tunnelName,
    metadata,
    mode,
  } = useContext(DeploymentRegistrationContext);
  const isEndpoint = stage === 'endpoint';
  const isAdvanced = stage === 'advanced';
  const isConfirm = stage === 'confirm';

  const isOnboarding = useOnboarding();

  const hasAdditionalHeaders = Boolean(
    additionalHeaders &&
      additionalHeaders.items &&
      additionalHeaders.items.some(({ key, value }) => key && value),
  );
  const hasMetadata = Boolean(
    metadata &&
      metadata.items &&
      metadata.items.some(({ key, value }) => key && value),
  );
  const canSkipAdvanced =
    isOnboarding ||
    mode === 'update' ||
    (!hasAdditionalHeaders && !useHttp11 && !hasMetadata);

  const isHttp1Error =
    error instanceof RestateError && error.restateCode === 'META0014';
  const isBreakingChangeError =
    error instanceof RestateError && error.restateCode === 'META0006';

  return {
    isAdvanced,
    isEndpoint,
    isConfirm,
    isLambda,
    isDuplicate,
    endpoint,
    goToAdvanced,
    goToConfirm,
    goToEndpoint,
    updateEndpoint,
    isPending,
    formId,
    additionalHeaders,
    metadata,
    services,
    max_protocol_version,
    min_protocol_version,
    sdk_version,
    updateAssumeRoleArn,
    updateUseHttp11Arn,
    updateShouldForce,
    shouldForce,
    useHttp11,
    assumeRoleArn,
    error,
    canSkipAdvanced,
    isTunnel,
    tunnelName,
    isOnboarding,
    targetType: getTargetType(endpoint, tunnelName),
    isHttp1Error,
    isBreakingChangeError,
    updateShouldAllowBreakingChange,
    shouldAllowBreakingChange,
    isUpdate: mode === 'update',
    isRegister: mode === 'register',
  };
}
