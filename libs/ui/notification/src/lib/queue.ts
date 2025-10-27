import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';
import type { ReactNode } from 'react';

export interface NotificationContent {
  content: ReactNode;
  type: 'error' | 'pending' | 'warning' | 'info' | 'success' | 'tooltip';
}

export const notificationQueue = new ToastQueue<NotificationContent>({
  maxVisibleToasts: 99999999,
});

const TIMEOUTS: Partial<Record<NotificationContent['type'], number>> = {
  info: 5000,
  success: 5000,
};

function showNotificationWithType(type: NotificationContent['type']) {
  return function (message: ReactNode) {
    const timeout = TIMEOUTS[type];
    const id = notificationQueue.add(
      { content: message, type },
      {
        // timeout,
      },
    );

    return {
      id,
      hide: () => {
        notificationQueue.close(id);
      },
    };
  };
}

export const showErrorNotification = showNotificationWithType('error');
export const showInfoNotification = showNotificationWithType('info');
export const showSuccessNotification = showNotificationWithType('success');
export const showPendingNotification = showNotificationWithType('pending');
export const showWarningNotification = showNotificationWithType('warning');
export const showTooltipNotification = showNotificationWithType('tooltip');
