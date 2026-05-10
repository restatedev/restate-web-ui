import { type PropsWithChildren } from 'react';
import { ZONE_IDS, LayoutZone } from './LayoutZone';
import { SidebarComplementaryOutlet } from './SidebarComplementaryOutlet';
import {
  NOTIFICATION_ZONE_ID,
  NotificationRegion,
} from '@restate/ui/notification';
import { Toolbar } from './Toolbar';
import { Sidebar, SidebarProvider } from './Sidebar';

export function SidebarLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <div className="ml-[calc((100%-100vw)/2)] flex min-h-screen w-[calc(100%+(100vw-100%)/2)] overflow-x-clip [--cp-toolbar-top:0.75rem] [--cp-toolbar-tuck:0.75rem] sm:[--cp-toolbar-top:1.5rem] sm:[--cp-toolbar-tuck:1.5rem]">
        <Sidebar />
        <div className="mx-auto flex min-h-screen min-w-0 flex-col border-r border-l border-white/80 px-3 py-3 max-md:w-screen max-md:shrink-0 sm:px-6 sm:py-6 md:w-full md:flex-1 lg:px-8 [&:has(#layout-content_[data-content-panel-fill-viewport])]:pb-0 sm:[&:has(#layout-content_[data-content-panel-fill-viewport])]:pb-0">
          <div
            id={NOTIFICATION_ZONE_ID}
            className="sticky top-3 z-110 mx-auto h-0 w-full max-w-4xl"
          />
          <NotificationRegion />
          <main
            id={ZONE_IDS[LayoutZone.Content]}
            className="relative flex max-w-full min-w-0 flex-auto flex-col px-4 pt-4 pb-32 [&:has([data-content-panel-fill-viewport])]:min-h-0 [&:has([data-content-panel-fill-viewport])]:flex-1 [&:has([data-content-panel-fill-viewport])]:pb-0 [&:has([data-content-panel-fill-viewport])>*]:flex-1"
          />
          {children}
          <Toolbar id={ZONE_IDS[LayoutZone.Toolbar]} />
        </div>
        <SidebarComplementaryOutlet id={ZONE_IDS[LayoutZone.Complementary]} />
      </div>
    </SidebarProvider>
  );
}
