import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@restate/data-access/admin-api';
import { useEnvironmentStatus } from './EnvironmentStatusContext';

export function Version() {
  const accountId = useAccountParam();
  const environmentId = useEnvironmentParam();
  const status = useEnvironmentStatus(environmentId);
  const { data: version } = useQuery({
    ...adminApi(
      '/openapi',
      'get',
      `/api/accounts/${accountId}/environments/${environmentId}/admin`
    ),
    enabled: Boolean(status && status !== 'PENDING'),
    select(data) {
      return (data?.info as unknown as { version: string })?.version;
    },
  });

  if (!version) {
    return null;
  }

  return (
    <span className="text-2xs font-mono items-center rounded-xl px-2 leading-4 bg-white/50 ring-1 ring-inset ring-gray-500/20 text-gray-500 mt-0.5">
      v{version}
    </span>
  );
}
