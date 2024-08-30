import { createContext, PropsWithChildren, useContext, useState } from 'react';

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
function getCookieValue(name: string) {
  const cookies = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('='));
  const cookieValue = cookies.find(([key]) => key === name)?.at(1);
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

export function AdminBaseURLProvider({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const [baseUrl] = useState(() => getCookieValue('adminBaseUrl') ?? '');

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
