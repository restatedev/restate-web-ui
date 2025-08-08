import { ToastQueue } from '@react-stately/toast';
import type { ReactNode } from 'react';

export interface NotificationContent {
  content: ReactNode;
  type: 'error' | 'pending' | 'warning' | 'info' | 'success';
}

export const notificationQueue = new ToastQueue<NotificationContent>({
  maxVisibleToasts: 99999999,
  hasExitAnimation: true,
});

const PRIORITIES: Record<NotificationContent['type'], number> = {
  error: 500,
  info: 100,
  pending: 400,
  success: 200,
  warning: 300,
};

function showNotificationWithType(type: NotificationContent['type']) {
  return function (message: ReactNode) {
    const id = notificationQueue.add(
      { content: message, type },
      {
        priority: PRIORITIES[type] + notificationQueue.visibleToasts.length,
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
