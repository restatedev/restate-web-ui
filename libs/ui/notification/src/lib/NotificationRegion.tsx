import { UNSTABLE_ToastRegion as ToastRegion } from 'react-aria-components';
import { notificationQueue } from './queue';
import { Notification } from './Notification';

export function NotificationRegion() {
  return (
    <ToastRegion
      queue={notificationQueue}
      className="sticky bottom-[calc(100vh-8.5rem)] max-w-6xl 3xl:max-w-[min(100rem,calc(100vw-800px-4rem))] mx-auto flex h-10 min-h-10 flex-none flex-col flex-nowrap items-stretch justify-between sm:top-24 [&:has(*)]:z-110"
    >
      {({ toast }) => <Notification toast={toast} />}
    </ToastRegion>
  );
}
