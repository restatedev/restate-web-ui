import { Form, useNavigate, useSearchParams } from 'react-router';
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
} from '@restate/data-access/admin-api-hooks';
import { useRestateContext } from '@restate/features/restate-context';
import { REGISTER_DEPLOYMENT_QUERY } from './constant';
import {
  ONBOARDING_QUERY_PARAM,
  useOnboarding,
} from '@restate/util/feature-flag';
import { SERVICE_QUERY_PARAM } from '@restate/features/service';

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

type Action =
  | NavigateToAdvancedAction
  | NavigateToConfirmAction
  | NavigateToEndpointAction
  | UpdateEndpointAction
  | UpdateRoleArnAction
  | UpdateUseHttp11Action
  | UpdateServicesActions
  | UpdateShouldForce;

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
  isPending?: boolean;
  isDuplicate?: boolean;
  shouldForce?: boolean;
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
  error: RestateError | Error | null | undefined;
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
      return { ...state, ...action.payload };
    case 'UpdateRoleArnAction':
      return { ...state, assumeRoleArn: action.payload.assumeRoleArn };
    case 'UpdateUseHttp11Action':
      return { ...state, useHttp11: action.payload.useHttp11 };
    case 'UpdateServicesActions':
      return { ...state, ...action.payload };
    case 'UpdateShouldForce':
      return { ...state, shouldForce: action.payload.shouldForce };

    default:
      return state;
  }
}

const initialState: (args?: {
  searchParams?: URLSearchParams;
  deployments?: adminApi.Deployment[];
}) => DeploymentRegistrationContextInterface = (args) => {
  const endpoint = args?.searchParams?.get(REGISTER_DEPLOYMENT_QUERY);
  const isOnboarding =
    args?.searchParams?.get(ONBOARDING_QUERY_PARAM) === 'true';
  const isEndpointValid =
    endpoint?.startsWith('http') || endpoint?.startsWith('arn');

  return {
    stage: 'endpoint',
    isLambda: false,
    isTunnel: false,
    error: null,
    endpoint: '',
    tunnelName: '',
    ...(isEndpointValid && {
      endpoint: String(endpoint),
      isLambda: endpoint?.startsWith('arn'),
      isDuplicate: args?.deployments?.some(
        (deployment) =>
          endpoint &&
          withoutTrailingSlash(getEndpoint(deployment)) ===
            withoutTrailingSlash(endpoint),
      ),
    }),
  };
};
const DeploymentRegistrationContext =
  createContext<DeploymentRegistrationContextInterface>(initialState());

function withoutTrailingSlash(url?: string) {
  return url?.endsWith('/') ? url.slice(0, -1) : url;
}

export function DeploymentRegistrationState(props: PropsWithChildren<unknown>) {
  const id = useId();
  const { tunnel, baseUrl } = useRestateContext();
  const formRef = useRef<HTMLFormElement>(null);
  const [searchParams] = useSearchParams();
  const { refetch, data: listDeployments } = useListDeployments();

  const [state, dispatch] = useReducer(
    reducer,
    {
      searchParams,
      deployments: Array.from(listDeployments?.deployments.values() ?? []),
    },
    initialState,
  );
  const additionalHeaders = useListData<{
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
  const isOnboarding = useOnboarding();

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

  const navigate = useNavigate();
  const { mutate, isPending, error, reset } = useRegisterDeployment({
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
        if (isOnboarding && data && data?.services.length > 0) {
          navigate({
            pathname: `${baseUrl}/overview`,
            search: `?${SERVICE_QUERY_PARAM}=${data?.services.at(0)?.name}&${ONBOARDING_QUERY_PARAM}=true`,
          });
        }
      } else {
        goToConfirm();
      }
    },
  });

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
      if (
        state.isLambda !== value.isLambda ||
        state.isTunnel !== value.isTunnel
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
    } = state;

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

    mutate({
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
                uri: endpoint,
                use_http_11: Boolean(useHttp11),
              }),
        force: Boolean(shouldForce),
        dry_run: action === 'dryRun',
        additional_headers,
      },
    });
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
        error,
        isPending,
      }}
    >
      <Form
        id={id}
        method="post"
        action="/deployments"
        ref={formRef}
        onSubmit={submitHandler}
      >
        {props.children}
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
  const canSkipAdvanced =
    isOnboarding ||
    (!hasAdditionalHeaders && !useHttp11 && !assumeRoleArn && !isLambda);

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
  };
}
