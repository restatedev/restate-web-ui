import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { TenantSidebar } from '@restate/features/tenant-view';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';

interface TenantPreviewProps {
  scope: string;
  header: ReactNode;
}

export function TenantPreview({ scope, header }: TenantPreviewProps) {
  return (
    <>
      <TenantSidebar scope={scope} header={header} />
      <LayoutOutlet zone={LayoutZone.Content}>
        <Outlet />
      </LayoutOutlet>
    </>
  );
}
