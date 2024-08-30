import { createContext, PropsWithChildren, useContext } from 'react';

const AdminBaseURLContext = createContext<{ baseUrl: string }>({ baseUrl: '' });

export function CloudAdminBaseURLProvider({
  accountId,
  environmentId,
  children,
}: PropsWithChildren<{
  environmentId: string;
  accountId: string;
}>) {
  return (
    <AdminBaseURLContext.Provider
      value={{
        baseUrl: `/api/accounts/${accountId}/environments/${environmentId}/admin`,
      }}
    >
      {children}
    </AdminBaseURLContext.Provider>
  );
}

export function AdminBaseURLProvider({
  baseUrl,
  children,
}: PropsWithChildren<{
  baseUrl: string;
}>) {
  return (
    <AdminBaseURLContext.Provider
      value={{
        baseUrl,
      }}
    >
      {children}
    </AdminBaseURLContext.Provider>
  );
}

export function useAdminBaseUrl() {
  const { baseUrl } = useContext(AdminBaseURLContext);
  return baseUrl;
}
