import { Form } from '@remix-run/react';
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
import {
  useListDeployments,
  useRegisterDeployment,
} from '@restate/data-access/admin-api';
import { useDialog } from '@restate/ui/dialog';
import { getEndpoint } from '../types';
import { showSuccessNotification } from '@restate/ui/notification';
import { RestateError } from '@restate/util/errors';

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
    'endpoint' | 'isLambda' | 'isDuplicate'
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
  payload: Pick<DeploymentRegistrationContextInterface, 'services'>;
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
  stage: 'endpoint' | 'advanced' | 'confirm';
  assumeRoleArn?: string;
  useHttp11?: boolean;
  isLambda: boolean;
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
      return { ...state, services: action.payload.services };
    case 'UpdateShouldForce':
      return { ...state, shouldForce: action.payload.shouldForce };

    default:
      return state;
  }
}

const initialState: DeploymentRegistrationContextInterface = {
  stage: 'endpoint',
  isLambda: false,
  error: null,
  endpoint: '',
};
const DeploymentRegistrationContext =
  createContext<DeploymentRegistrationContextInterface>(initialState);

function withoutTrailingSlash(url?: string) {
  return url?.endsWith('/') ? url.slice(0, -1) : url;
}

export function DeploymentRegistrationState(props: PropsWithChildren<unknown>) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
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

  const updateServices = useCallback(
    (services: DeploymentRegistrationContextInterface['services']) => {
      dispatch({ type: 'UpdateServicesActions', payload: { services } });
    },
    []
  );
  const updateShouldForce = useCallback(
    (shouldForce: DeploymentRegistrationContextInterface['shouldForce']) => {
      dispatch({ type: 'UpdateShouldForce', payload: { shouldForce } });
    },
    []
  );
  const { refetch, data: listDeployments } = useListDeployments();

  const { mutate, isPending, error, reset } = useRegisterDeployment({
    onSuccess(data) {
      updateServices(data?.services);

      if (state.stage === 'confirm') {
        refetch();
        close();
        showSuccessNotification(
          <>
            <code>{data?.id}</code> has been successfully registered.
          </>
        );
      } else {
        goToConfirm();
      }
    },
  });

  const updateEndpoint = useCallback(
    (value: UpdateEndpointAction['payload']) => {
      reset();
      if (state.isLambda !== value.isLambda) {
        formRef.current?.reset();
      }
      const isDuplicate = Array.from(
        listDeployments?.deployments.values() ?? []
      ).some(
        (deployment) =>
          withoutTrailingSlash(getEndpoint(deployment)) ===
          withoutTrailingSlash(value.endpoint)
      );
      dispatch({
        type: 'UpdateEndpointAction',
        payload: {
          isLambda: value.isLambda,
          endpoint: value.endpoint,
          isDuplicate,
        },
      });
    },
    [listDeployments, state.isLambda, reset]
  );
  const updateAssumeRoleArn = useCallback(
    (assumeRoleArn: string) => {
      reset();
      dispatch({ type: 'UpdateRoleArnAction', payload: { assumeRoleArn } });
    },
    [reset]
  );
  const updateUseHttp11Arn = useCallback(
    (useHttp11: boolean) => {
      reset();
      dispatch({ type: 'UpdateUseHttp11Action', payload: { useHttp11 } });
    },
    [reset]
  );

  const submitHandler = (event: FormEvent<HTMLFormElement>) => {
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
  } = useContext(DeploymentRegistrationContext);
  const isEndpoint = stage === 'endpoint';
  const isAdvanced = stage === 'advanced';
  const isConfirm = stage === 'confirm';

  const hasAdditionalHeaders = Boolean(
    additionalHeaders &&
      additionalHeaders.items &&
      additionalHeaders.items.some(({ key, value }) => key && value)
  );
  const canSkipAdvanced = !hasAdditionalHeaders && !useHttp11 && !assumeRoleArn;

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
    updateAssumeRoleArn,
    updateUseHttp11Arn,
    updateShouldForce,
    shouldForce,
    useHttp11,
    assumeRoleArn,
    error,
    canSkipAdvanced,
  };
}
