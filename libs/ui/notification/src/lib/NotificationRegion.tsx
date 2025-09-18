import { AriaToastRegionProps, useToastRegion } from '@react-aria/toast';
import { useToastQueue } from '@react-stately/toast';
import { useRef } from 'react';
import { notificationQueue } from './queue';
import { Notification } from './Notification';

export function NotificationRegion(props: AriaToastRegionProps) {
  const state = useToastQueue(notificationQueue);
  const ref = useRef<HTMLDivElement>(null);
  const { regionProps } = useToastRegion(props, state, ref);

  return (
    <div
      {...regionProps}
      ref={ref}
      className="sticky top-20 mx-4 flex h-10 min-h-10 flex-none flex-col flex-nowrap items-stretch justify-between sm:top-24 [&:has(*)]:z-110"
    >
      {state.visibleToasts.map((toast) => (
        <Notification key={toast.key} toast={toast} state={state} />
      ))}
    </div>
  );
}
