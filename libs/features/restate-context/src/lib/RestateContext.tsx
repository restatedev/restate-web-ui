import {
  AdminBaseURLProvider,
  useHealth,
  useVersion,
} from '@restate/data-access/admin-api';
import { createContext, PropsWithChildren, useContext } from 'react';

type Status = 'HEALTHY' | 'DEGRADED' | (string & {});
type RestateContext = {
  status?: Status;
  version?: string;
};

const InternalRestateContext = createContext<RestateContext>({});

function InternalRestateContextProvider({
  children,
  status: overriddenStatus,
}: PropsWithChildren<{ status?: Status }>) {
  const { data } = useVersion();
  const version = data?.version;

  const { isSuccess, isError } = useHealth({ enabled: !overriddenStatus });
  const status: Status | undefined = overriddenStatus
    ? overriddenStatus
    : isSuccess
    ? 'HEALTHY'
    : isError
    ? 'DEGRADED'
    : undefined;

  return (
    <InternalRestateContext.Provider value={{ version, status }}>
      {children}
    </InternalRestateContext.Provider>
  );
}

export function RestateContextProvider({
  children,
  adminBaseUrl,
}: PropsWithChildren<{
  adminBaseUrl?: string;
}>) {
  return (
    <AdminBaseURLProvider baseUrl={adminBaseUrl}>
      <InternalRestateContextProvider>
        {children}
      </InternalRestateContextProvider>
    </AdminBaseURLProvider>
  );
}

export function useRestateContext() {
  return useContext(InternalRestateContext);
}
