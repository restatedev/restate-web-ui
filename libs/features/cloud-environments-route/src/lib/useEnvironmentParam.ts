import { useParams } from '@remix-run/react';

export function useEnvironmentParam() {
  const params = useParams<{ environmentId: string }>();
  return params.environmentId;
}
