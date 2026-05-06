import { type PropsWithChildren } from 'react';
import { ZONE_IDS, LayoutZone } from './LayoutZone';
import { SidebarComplementaryOutlet } from './SidebarComplementaryOutlet';
import { NotificationRegion } from '@restate/ui/notification';
import { Toolbar } from './Toolbar';
import { Sidebar, SidebarProvider } from './Sidebar';

export function SidebarLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <div className="ml-[calc((100%-100vw)/2)] flex min-h-screen w-[calc(100%+(100vw-100%)/2)] overflow-x-clip">
        <Sidebar />
        <div className="mx-auto flex min-h-screen w-full min-w-0 flex-1 flex-col border-r border-l border-white/80 px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
          <NotificationRegion />
          <main
            id={ZONE_IDS[LayoutZone.Content]}
            className="relative flex max-w-full min-w-0 flex-auto flex-col px-4 pt-4 pb-32"
          />
          {children}
          <Toolbar id={ZONE_IDS[LayoutZone.Toolbar]} />
        </div>
        <SidebarComplementaryOutlet id={ZONE_IDS[LayoutZone.Complementary]} />
      </div>
    </SidebarProvider>
  );
}
