import { Outlet } from 'react-router';
import { TenantSidebar } from '@restate/features/tenant-view';
import { LayoutOutlet, LayoutZone } from '@restate/ui/layout';

interface TenantPreviewProps {
  scope: string;
}

export function TenantPreview({ scope }: TenantPreviewProps) {
  return (
    <>
      <TenantSidebar scope={scope} />
      <LayoutOutlet zone={LayoutZone.Content}>
        <Outlet />
      </LayoutOutlet>
    </>
  );
}
