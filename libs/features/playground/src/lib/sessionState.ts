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

const apiKeys = new Map<string, ApiKeyState>();

export function useApiKey(scope: string) {
  const [state, setState] = useState<ApiKeyState>(
    () => apiKeys.get(scope) ?? { isVisible: false, value: '' },
  );
  const update = useCallback(
    (next: ApiKeyState) => {
      apiKeys.set(scope, next);
      setState(next);
    },
    [scope],
  );
  return [state, update] as const;
}
