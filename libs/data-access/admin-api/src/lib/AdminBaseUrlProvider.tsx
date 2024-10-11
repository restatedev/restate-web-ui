import { createContext, PropsWithChildren, useContext } from 'react';

const AdminBaseURLContext = createContext<{ baseUrl: string }>({ baseUrl: '' });

export function AdminBaseURLProvider({
  children,
  baseUrl = '',
}: PropsWithChildren<{ baseUrl?: string }>) {
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
