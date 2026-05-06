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
        className="relative flex h-10 min-h-10 w-full flex-col flex-nowrap items-stretch justify-between [&_li:first-child+*+*>*]:z-60 [&_li:first-child+*+*>*]:-translate-y-3 [&_li:first-child+*+*>*]:scale-90 [&_li:first-child+*+*~*>*]:invisible [&_li:first-child+*+*~*>*]:z-60 [&_li:first-child+*+*~*>*]:scale-50 [&_li:first-child+*>*]:z-70 [&_li:first-child+*>*]:-translate-y-1.5 [&_li:first-child+*>*]:scale-95 [&_li:first-child>*]:z-80"
      >
        {({ toast }) => (
          <Notification toast={toast} queue={notificationQueue} />
        )}
      </ToastRegion>
    </UNSAFE_PortalProvider>
  );
}
