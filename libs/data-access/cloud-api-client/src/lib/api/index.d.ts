/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/cloud/GetUserIdentity': {
    /** Returns the user identity */
    post: operations['getUserIdentity'];
  };
  '/cloud/CreateAccount': {
    /** Creates a cloud account */
    post: operations['createAccount'];
  };
  '/cloud/ListAccounts': {
    /** returns all cloud accounts the user has access to */
    post: operations['listAccounts'];
  };
  '/cloud/{accountId}/CreateEnvironment': {
    /** Creates an environment */
    post: operations['createEnvironment'];
  };
  '/cloud/{accountId}/DescribeEnvironment': {
    /** Returns the environments details */
    post: operations['describeEnvironment'];
  };
  '/cloud/{accountId}/DestroyEnvironment': {
    /** Destroys an environment */
    post: operations['destroyEnvironment'];
  };
  '/cloud/{accountId}/ListEnvironments': {
    /** Returns all the environments for an account */
    post: operations['listEnvironments'];
  };
  '/cloud/{accountId}/CreateApiKey': {
    /** Creates an api key on an environment with the specified role */
    post: operations['createApiKey'];
  };
  '/cloud/{accountId}/DescribeApiKey': {
    /** Returns the api key details */
    post: operations['describeApiKey'];
  };
  '/cloud/{accountId}/DeleteApiKey': {
    /** Deletes the api key */
    post: operations['deleteApiKey'];
  };
  '/cloud/{accountId}/ListApiKeys': {
    /** Returns all the api keys */
    post: operations['listApiKeys'];
  };
}

export type webhooks = Record<string, never>;

export interface components {
  schemas: {
    GetUserIdentityResponse: components['schemas']['User'];
    User: {
      /** @description The user id */
      userId: string;
    };
    Account: {
      /** @description The account id */
      accountId: string;
      /** @description The account description */
      description?: string;
    };
    EnvironmentId: {
      /** @description The environment id */
      environmentId: string;
    };
    Environment: components['schemas']['EnvironmentId'] & {
      /** @description The environment description */
      description?: string;
      /**
       * @description The environment status
       * @enum {string}
       */
      status?:
        | 'PROVISIONING_NEW'
        | 'PROVISIONING_CREATING'
        | 'PROVISIONING_READY'
        | 'PROVISIONING_SHUTTING_DOWN'
        | 'PROVISIONING_DELETED'
        | 'PROVISIONING_FAILED'
        | 'UNRECOGNIZED';
    };
    CreateAccountResponse: components['schemas']['Account'];
    CreateAccountRequestBody: {
      /** @description The account description */
      description?: string;
    };
    ListAccountsResponse: {
      accounts: components['schemas']['Account'][];
    };
    CreateEnvironmentRequestBody: {
      /** @description The account description */
      description?: string;
    };
    CreateEnvironmentResponse: components['schemas']['EnvironmentId'];
    DestroyEnvironmentRequestBody: components['schemas']['EnvironmentId'];
    DestroyEnvironmentResponse: {
      error?: string;
    };
    DescribeEnvironmentRequestBody: components['schemas']['EnvironmentId'];
    DescribeEnvironmentResponse: components['schemas']['Environment'];
    ListEnvironmentsResponse: {
      environments: components['schemas']['EnvironmentId'][];
    };
    /** @enum {string} */
    Role:
      | 'rst:role::FullAccess'
      | 'rst:role::IngressAccess'
      | 'rst:role::AdminAccess'
      | 'rst:role::ResolveAwakeableAccess';
    /** @enum {string} */
    ApiKeyState:
      | 'KEY_NEW'
      | 'KEY_ACTIVE'
      | 'KEY_DISABLED'
      | 'KEY_DELETED'
      | 'UNRECOGNIZED';
    CreateApiKeyRequestBody: {
      roleId: components['schemas']['Role'];
      environmentId: string;
      /** @description The environment description */
      description?: string;
    };
    CreateApiKeyResponse: {
      keyId?: string;
      environmentId: string;
      roleId: components['schemas']['Role'];
      state: components['schemas']['ApiKeyState'];
      accountId: string;
      apiKey: string;
    };
    DescribeApiKeyRequestBody: {
      keyId: string;
    };
    DescribeApiKeyResponse: components['schemas']['CreateApiKeyResponse'] & {
      description?: string;
    };
    DeleteApiKeyRequestBody: {
      keyId: string;
      environmentId: string;
    };
    DeleteApiKeyResponse: {
      error?: string;
    };
    ListApiKeysRequestBody: {
      keyId: string;
      environmentId: string;
    };
    ListApiKeysResponse: {
      keyId?: string;
      environmentId?: string;
    }[];
  };
  responses: {
    /** @description Access token is missing or invalid */
    UnauthorizedError: {
      content: never;
    };
    /** @description Access token is missing or invalid */
    InternalServerError: {
      content: {
        'text/plain': string;
      };
    };
  };
  parameters: {
    /** @description The account id */
    AccountId: string;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}

export type $defs = Record<string, never>;

export type external = Record<string, never>;

export interface operations {
  /** Returns the user identity */
  getUserIdentity: {
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['GetUserIdentityResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Creates a cloud account */
  createAccount: {
    /** @description Specify the description */
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateAccountRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['CreateAccountResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** returns all cloud accounts the user has access to */
  listAccounts: {
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['ListAccountsResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Creates an environment */
  createEnvironment: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the description */
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateEnvironmentRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['CreateEnvironmentResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Returns the environments details */
  describeEnvironment: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the environment id */
    requestBody: {
      content: {
        'application/json': components['schemas']['DescribeEnvironmentRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['DescribeEnvironmentResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Destroys an environment */
  destroyEnvironment: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the environment id */
    requestBody: {
      content: {
        'application/json': components['schemas']['DestroyEnvironmentRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['DestroyEnvironmentResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Returns all the environments for an account */
  listEnvironments: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['ListEnvironmentsResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Creates an api key on an environment with the specified role */
  createApiKey: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the role and environment */
    requestBody: {
      content: {
        'application/json': components['schemas']['CreateApiKeyRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['CreateApiKeyResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Returns the api key details */
  describeApiKey: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the api key */
    requestBody: {
      content: {
        'application/json': components['schemas']['DescribeApiKeyRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['DescribeApiKeyResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Deletes the api key */
  deleteApiKey: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the api key and environment id */
    requestBody: {
      content: {
        'application/json': components['schemas']['DeleteApiKeyRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['DeleteApiKeyResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
  /** Returns all the api keys */
  listApiKeys: {
    parameters: {
      path: {
        accountId: components['parameters']['AccountId'];
      };
    };
    /** @description Specify the environment id */
    requestBody: {
      content: {
        'application/json': components['schemas']['ListApiKeysRequestBody'];
      };
    };
    responses: {
      /** @description OK */
      200: {
        content: {
          'application/json': components['schemas']['ListApiKeysResponse'];
        };
      };
      401: components['responses']['UnauthorizedError'];
      500: components['responses']['InternalServerError'];
    };
  };
}
