import { useQuery } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useContext } from 'react';
import { adminApi } from './api/adminApi';
import { useAdminBaseUrl } from './AdminBaseUrlProvider';
import { useAPIStatus } from './APIStatusProvider';

export interface SchemaRegistry {
  baseUrl: string;
  scope: string;
  isHealthy: boolean;
  error: Error | null;
}

const SchemaRegistryContext = createContext<SchemaRegistry | undefined>(
  undefined,
);

export function getSchemaRegistryScopeUrl(baseUrl: string, scope: string) {
  return `${baseUrl.replace(/\/+$/, '')}/v1/scopes/${encodeURIComponent(scope)}`;
}

export function SchemaRegistryProvider({
  children,
  baseUrl,
  scope,
}: PropsWithChildren<{ baseUrl: string; scope: string }>) {
  const scopeUrl = getSchemaRegistryScopeUrl(baseUrl, scope);
  const { isSuccess, error } = useQuery({
    ...adminApi('query', '/health', 'get', { baseUrl: scopeUrl }),
    retry: 2,
    refetchInterval: 60_000,
  });

  return (
    <SchemaRegistryContext.Provider
      value={{ baseUrl: scopeUrl, scope, isHealthy: isSuccess, error }}
    >
      {children}
    </SchemaRegistryContext.Provider>
  );
}

export function useSchemaRegistry() {
  return useContext(SchemaRegistryContext);
}

export function useIsReadOnly() {
  return Boolean(useSchemaRegistry());
}

export function useCatalogBaseUrl() {
  const registry = useSchemaRegistry();
  const adminBaseUrl = useAdminBaseUrl();
  return registry?.baseUrl ?? adminBaseUrl;
}

export function useCatalogAPIStatus() {
  const registry = useSchemaRegistry();
  const isAdminEnabled = useAPIStatus();
  return registry ? registry.isHealthy : isAdminEnabled;
}
