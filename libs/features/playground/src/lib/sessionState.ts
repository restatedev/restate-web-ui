import { useCallback, useState } from 'react';
import type { ParameterRole } from '@restate/util-openapi';

const SHARED_ROLES: ParameterRole[] = ['key', 'scope', 'limitKey'];

const sharedValues = new Map<string, Partial<Record<ParameterRole, string>>>();

export function sharedRoleValue(service: string, role: ParameterRole) {
  return SHARED_ROLES.includes(role)
    ? sharedValues.get(service)?.[role]
    : undefined;
}

export function rememberRoleValue(
  service: string,
  role: ParameterRole | undefined,
  value: string,
) {
  if (!role || !SHARED_ROLES.includes(role)) {
    return;
  }
  sharedValues.set(service, { ...sharedValues.get(service), [role]: value });
}

export interface ApiKeyState {
  isVisible: boolean;
  value: string;
}

const remembered = new Map<string, unknown>();

export function useRemembered<T>(key: string, initial: () => T) {
  const [state, setState] = useState<T>(() =>
    remembered.has(key) ? (remembered.get(key) as T) : initial(),
  );
  const update = useCallback(
    (next: T) => {
      remembered.set(key, next);
      setState(next);
    },
    [key],
  );
  return [state, update] as const;
}

export function useApiKey(scope: string) {
  return useRemembered<ApiKeyState>(`apiKey\n${scope}`, () => ({
    isVisible: false,
    value: '',
  }));
}
