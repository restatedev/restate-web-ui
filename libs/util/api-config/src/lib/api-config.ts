type ApiConfigProvider = {
  getToken: () => string | undefined;
  getRestateVersion: () => string | undefined;
  getFeatures: () => Record<string, boolean> | undefined;
};

let provider: ApiConfigProvider | undefined;

export function configureApiConfig(config: ApiConfigProvider) {
  provider = config;
}

export function getAuthToken(): string | undefined {
  return provider?.getToken();
}

export function getRestateVersion(): string | undefined {
  return provider?.getRestateVersion();
}

export function getFeatures(): Record<string, boolean> | undefined {
  return provider?.getFeatures();
}
