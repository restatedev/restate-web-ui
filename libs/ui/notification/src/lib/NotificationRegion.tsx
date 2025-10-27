import { UNSTABLE_ToastRegion as ToastRegion } from 'react-aria-components';
import { notificationQueue } from './queue';
import { Notification } from './Notification';

export function NotificationRegion() {
  return (
    <ToastRegion
      queue={notificationQueue}
      className="sticky bottom-[calc(100vh-8.5rem)] mx-auto flex h-10 min-h-10 max-w-6xl flex-none flex-col flex-nowrap items-stretch justify-between sm:top-24 3xl:max-w-[min(100rem,calc(100vw-800px-4rem))] [&_li:first-child+*+*>*]:z-60 [&_li:first-child+*+*>*]:-translate-y-3 [&_li:first-child+*+*>*]:scale-90 [&_li:first-child+*+*~*>*]:invisible [&_li:first-child+*+*~*>*]:z-60 [&_li:first-child+*+*~*>*]:scale-50 [&_li:first-child+*>*]:z-70 [&_li:first-child+*>*]:-translate-y-1.5 [&_li:first-child+*>*]:scale-95 [&_li:first-child>*]:z-80 [&:has(*)]:z-110"
    >
      {({ toast }) => <Notification toast={toast} />}
    </ToastRegion>
  );
}
