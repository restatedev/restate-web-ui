let authToken: string | undefined;
let restateVersion: string | undefined;
let features: Set<string> | undefined;

let { promise: metaReady, resolve: resolveReady } =
  Promise.withResolvers<void>();

export function setAuthToken(token: string | undefined): void {
  authToken = token;
}

export function setRestateVersion(version: string | undefined): void {
  restateVersion = version;
}

export function setFeatures(next: Set<string> | undefined): void {
  features = next;
}

export function getAuthToken(): string | undefined {
  return authToken;
}

export function getRestateVersion(): string | undefined {
  return restateVersion;
}

export function getFeatures(): Set<string> | undefined {
  return features;
}

export function awaitMeta(signal?: AbortSignal): Promise<void> {
  if (!signal) return metaReady;
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = () =>
      reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    metaReady.then(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    });
  });
}

export function markMetaReady(): void {
  resolveReady();
}

export function resetMetaReady(): void {
  ({ promise: metaReady, resolve: resolveReady } =
    Promise.withResolvers<void>());
}
