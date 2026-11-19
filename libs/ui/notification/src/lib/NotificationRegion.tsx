import { UNSTABLE_ToastRegion as ToastRegion } from 'react-aria-components';
import { UNSAFE_PortalProvider } from 'react-aria';
import { notificationQueue } from './queue';
import { Notification } from './Notification';

export const NOTIFICATION_ZONE_ID = 'restate-notification-zone';

export function NotificationRegion() {
  return (
    <UNSAFE_PortalProvider
      getContainer={() => document.getElementById(NOTIFICATION_ZONE_ID)}
    >
      <ToastRegion
        queue={notificationQueue}
        className="relative flex h-10 min-h-10 w-full flex-col flex-nowrap items-stretch justify-between [&_li:first-child>*]:z-80 [&_li:nth-child(2)>*]:z-70 [&_li:nth-child(2)>*]:-translate-y-1.5 [&_li:nth-child(2)>*]:scale-95 [&_li:nth-child(3)>*]:z-60 [&_li:nth-child(3)>*]:-translate-y-3 [&_li:nth-child(3)>*]:scale-90 [&_li:nth-child(n+4)>*]:invisible [&_li:nth-child(n+4)>*]:z-60 [&_li:nth-child(n+4)>*]:scale-50"
      >
        {({ toast }) => (
          <Notification toast={toast} queue={notificationQueue} />
        )}
      </ToastRegion>
    </UNSAFE_PortalProvider>
  );
}
