type AuthTokenProvider = () => string | undefined;

let provider: AuthTokenProvider | undefined;

export function configureAuthToken(getToken: AuthTokenProvider) {
  provider = getToken;
}

export function getAuthToken(): string | undefined {
  return provider?.();
}
