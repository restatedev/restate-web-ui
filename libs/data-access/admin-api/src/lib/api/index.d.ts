/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/services/{service}/handlers': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List service handlers
     * @description List all the handlers of the given service.
     */
    get: operations['list_service_handlers'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/invocations/{invocation_id}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    post?: never;
    /**
     * Terminate an invocation
     * @description Terminate the given invocation. By default, an invocation is terminated by gracefully cancelling it. This ensures virtual object state consistency. Alternatively, an invocation can be killed which does not guarantee consistency for virtual object instance state, in-flight invocations to other services, etc.
     */
    delete: operations['terminate_invocation'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/deployments': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List deployments
     * @description List all registered deployments.
     */
    get: operations['list_deployments'];
    put?: never;
    /**
     * Create deployment
     * @description Create deployment. Restate will invoke the endpoint to gather additional information required for registration, such as the services exposed by the deployment. If the deployment is already registered, this method will fail unless `force` is set to `true`.
     */
    post: operations['create_deployment'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/health': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Health check
     * @description Check REST API Health.
     */
    get: operations['health'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/services/{service}/handlers/{handler}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get service handler
     * @description Get the handler of a service
     */
    get: operations['get_service_handler'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/subscriptions': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List subscriptions
     * @description List all subscriptions.
     */
    get: operations['list_subscriptions'];
    put?: never;
    /**
     * Create subscription
     * @description Create subscription.
     */
    post: operations['create_subscription'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/services': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List services
     * @description List all registered services.
     */
    get: operations['list_services'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/services/{service}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get service
     * @description Get a registered service.
     */
    get: operations['get_service'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /**
     * Modify a service
     * @description Modify a registered service.
     */
    patch: operations['modify_service'];
    trace?: never;
  };
  '/deployments/{deployment}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get deployment
     * @description Get deployment metadata
     */
    get: operations['get_deployment'];
    put?: never;
    post?: never;
    /**
     * Delete deployment
     * @description Delete deployment. Currently it's supported to remove a deployment only using the force flag
     */
    delete: operations['delete_deployment'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/subscriptions/{subscription}': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get subscription
     * @description Get subscription
     */
    get: operations['get_subscription'];
    put?: never;
    post?: never;
    /**
     * Delete subscription
     * @description Delete subscription.
     */
    delete: operations['delete_subscription'];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/services/{service}/state': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /**
     * Modify a service state
     * @description Modify service state
     */
    post: operations['modify_service_state'];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  '/openapi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** OpenAPI specification */
    get: operations['openapi_spec'];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    ListServiceHandlersResponse: {
      handlers: components['schemas']['HandlerMetadata'][];
    };
    HandlerMetadata: {
      name: string;
      ty: components['schemas']['HandlerMetadataType'];
      input_description: string;
      output_description: string;
    };
    /** @enum {string} */
    HandlerMetadataType: 'Exclusive' | 'Shared' | 'Workflow';
    /**
     * Error description response
     * @description Error details of the response
     */
    ErrorDescriptionResponse: {
      message: string;
      /**
       * Restate code
       * @description Restate error code describing this error
       */
      restate_code?: string | null;
    };
    /** @enum {string} */
    TerminationMode: 'Cancel' | 'Kill';
    ListDeploymentsResponse: {
      deployments: components['schemas']['DeploymentResponse'][];
    };
    DeploymentResponse:
      | {
          id: components['schemas']['String'];
          /**
           * Services
           * @description List of services exposed by this deployment.
           */
          services: components['schemas']['ServiceNameRevPair'][];
        }
      | {
          uri: string;
          protocol_type: components['schemas']['ProtocolType'];
          additional_headers?: {
            [key: string]: string;
          };
          created_at: string;
        }
      | {
          arn: components['schemas']['LambdaARN'];
          assume_role_arn?: string | null;
          additional_headers?: {
            [key: string]: string;
          };
          created_at: string;
        };
    String: string;
    ServiceNameRevPair: {
      name: string;
      /** Format: uint32 */
      revision: number;
    };
    /** @enum {string} */
    ProtocolType: 'RequestResponse' | 'BidiStream';
    /** Format: arn */
    LambdaARN: string;
    ListSubscriptionsResponse: {
      subscriptions: components['schemas']['SubscriptionResponse'][];
    };
    SubscriptionResponse: {
      id: components['schemas']['String'];
      source: string;
      sink: string;
      options: {
        [key: string]: string;
      };
    };
    ListServicesResponse: {
      services: components['schemas']['ServiceMetadata'][];
    };
    ServiceMetadata: {
      /**
       * Name
       * @description Fully qualified name of the service
       */
      name: string;
      handlers: components['schemas']['HandlerMetadata'][];
      ty: components['schemas']['ServiceType'];
      /**
       * Deployment Id
       * @description Deployment exposing the latest revision of the service.
       */
      deployment_id: string;
      /**
       * Revision
       * Format: uint32
       * @description Latest revision of the service.
       */
      revision: number;
      /**
       * Public
       * @description If true, the service can be invoked through the ingress. If false, the service can be invoked only from another Restate service.
       */
      public: boolean;
      /**
       * Idempotency retention
       * @description The retention duration of idempotent requests for this service.
       */
      idempotency_retention: string;
      /**
       * Workflow completion retention
       * @description The retention duration of workflows. Only available on workflow services.
       */
      workflow_completion_retention?: string | null;
    };
    /** @enum {string} */
    ServiceType: 'Service' | 'VirtualObject' | 'Workflow';
    ModifyServiceRequest: {
      /**
       * Public
       * @description If true, the service can be invoked through the ingress. If false, the service can be invoked only from another Restate service.
       * @default null
       */
      public: boolean | null;
      /**
       * Idempotency retention
       * @description Modify the retention of idempotent requests for this service.
       *
       *     Can be configured using the [`humantime`](https://docs.rs/humantime/latest/humantime/fn.parse_duration.html) format.
       * @default null
       */
      idempotency_retention: string | null;
      /**
       * Workflow completion retention
       * @description Modify the retention of the workflow completion. This can be modified only for workflow services!
       *
       *     Can be configured using the [`humantime`](https://docs.rs/humantime/latest/humantime/fn.parse_duration.html) format.
       * @default null
       */
      workflow_completion_retention: string | null;
    };
    ModifyServiceStateRequest: {
      /**
       * Version
       * @description If set, the latest version of the state is compared with this value and the operation will fail when the versions differ.
       */
      version?: string | null;
      /**
       * Service key
       * @description To what virtual object key to apply this change
       */
      object_key: string;
      /**
       * New State
       * @description The new state to replace the previous state with
       */
      new_state: {
        [key: string]: number[];
      };
    };
    RegisterDeploymentRequest:
      | {
          /**
           * Uri
           * @description Uri to use to discover/invoke the http deployment.
           */
          uri: string;
          /**
           * Additional headers
           * @description Additional headers added to the discover/invoke requests to the deployment.
           */
          additional_headers?: {
            [key: string]: string;
          } | null;
          /**
           * Force
           * @description If `true`, it will override, if existing, any deployment using the same `uri`. Beware that this can lead in-flight invocations to an unrecoverable error state.
           *
           *     By default, this is `true` but it might change in future to `false`.
           *
           *     See the [versioning documentation](https://docs.restate.dev/operate/versioning) for more information.
           * @default true
           */
          force: boolean;
          /**
           * Dry-run mode
           * @description If `true`, discovery will run but the deployment will not be registered. This is useful to see the impact of a new deployment before registering it.
           * @default false
           */
          dry_run: boolean;
        }
      | {
          /**
           * ARN
           * @description ARN to use to discover/invoke the lambda deployment.
           */
          arn: string;
          /**
           * Assume role ARN
           * @description Optional ARN of a role to assume when invoking the addressed Lambda, to support role chaining
           */
          assume_role_arn?: string | null;
          /**
           * Additional headers
           * @description Additional headers added to the discover/invoke requests to the deployment.
           */
          additional_headers?: {
            [key: string]: string;
          } | null;
          /**
           * Force
           * @description If `true`, it will override, if existing, any deployment using the same `uri`. Beware that this can lead in-flight invocations to an unrecoverable error state.
           *
           *     By default, this is `true` but it might change in future to `false`.
           *
           *     See the [versioning documentation](https://docs.restate.dev/operate/versioning) for more information.
           * @default true
           */
          force: boolean;
          /**
           * Dry-run mode
           * @description If `true`, discovery will run but the deployment will not be registered. This is useful to see the impact of a new deployment before registering it.
           * @default false
           */
          dry_run: boolean;
        };
    RegisterDeploymentResponse: {
      id: components['schemas']['String'];
      services: components['schemas']['ServiceMetadata'][];
    };
    DetailedDeploymentResponse:
      | {
          id: components['schemas']['String'];
          /**
           * Services
           * @description List of services exposed by this deployment.
           */
          services: components['schemas']['ServiceMetadata'][];
        }
      | {
          uri: string;
          protocol_type: components['schemas']['ProtocolType'];
          additional_headers?: {
            [key: string]: string;
          };
          created_at: string;
        }
      | {
          arn: components['schemas']['LambdaARN'];
          assume_role_arn?: string | null;
          additional_headers?: {
            [key: string]: string;
          };
          created_at: string;
        };
    CreateSubscriptionRequest: {
      /**
       * Source
       * @description Source uri. Accepted forms:
       *
       *     * `kafka://<cluster_name>/<topic_name>`, e.g. `kafka://my-cluster/my-topic`
       */
      source: string;
      /**
       * Sink
       * @description Sink uri. Accepted forms:
       *
       *     * `service://<service_name>/<service_name>`, e.g. `service://Counter/count`
       */
      sink: string;
      /**
       * Options
       * @description Additional options to apply to the subscription.
       */
      options?: {
        [key: string]: string;
      } | null;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  list_service_handlers: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Fully qualified service name. */
        service: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ListServiceHandlersResponse'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  terminate_invocation: {
    parameters: {
      query?: {
        /** @description If cancel, it will gracefully terminate the invocation. If kill, it will terminate the invocation with a hard stop. */
        mode?: components['schemas']['TerminationMode'];
      };
      header?: never;
      path: {
        /** @description Invocation identifier. */
        invocation_id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  list_deployments: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ListDeploymentsResponse'];
        };
      };
    };
  };
  create_deployment: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['RegisterDeploymentRequest'];
      };
    };
    responses: {
      /** @description Created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['RegisterDeploymentResponse'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  health: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description OK */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  get_service_handler: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Fully qualified service name. */
        service: string;
        /** @description Handler name. */
        handler: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['HandlerMetadata'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  list_subscriptions: {
    parameters: {
      query?: {
        /** @description Filter by the exact specified sink. */
        sink?: string;
        /** @description Filter by the exact specified source. */
        source?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ListSubscriptionsResponse'];
        };
      };
    };
  };
  create_subscription: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateSubscriptionRequest'];
      };
    };
    responses: {
      /** @description Created */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['SubscriptionResponse'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  list_services: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ListServicesResponse'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  get_service: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Fully qualified service name. */
        service: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ServiceMetadata'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  modify_service: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Fully qualified service name. */
        service: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ModifyServiceRequest'];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ServiceMetadata'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  get_deployment: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Deployment identifier */
        deployment: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['DetailedDeploymentResponse'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  delete_deployment: {
    parameters: {
      query?: {
        /** @description If true, the deployment will be forcefully deleted. This might break in-flight invocations, use with caution. */
        force?: boolean;
      };
      header?: never;
      path: {
        /** @description Deployment identifier */
        deployment: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      /** @description Not implemented. Only using the force flag is supported at the moment. */
      501: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  get_subscription: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subscription identifier */
        subscription: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['SubscriptionResponse'];
        };
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  delete_subscription: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subscription identifier */
        subscription: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  modify_service_state: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Fully qualified service name. */
        service: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ModifyServiceStateRequest'];
      };
    };
    responses: {
      /** @description Accepted */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      403: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      409: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
      503: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ErrorDescriptionResponse'];
        };
      };
    };
  };
  openapi_spec: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': {
            [key: string]: string;
          };
        };
      };
    };
  };
}