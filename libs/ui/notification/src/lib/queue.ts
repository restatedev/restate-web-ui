import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';
import type { ReactNode } from 'react';

export interface NotificationContent {
  content: ReactNode;
  type:
    | 'error'
    | 'pending'
    | 'warning'
    | 'info'
    | 'success'
    | 'tooltip'
    | 'countdown'
    | 'progress';
  promise?: {
    resolve?: (value: unknown) => void;
    reject?: (reason?: unknown) => void;
  };
}

class CustomQueue<T> extends ToastQueue<T> {
  override close(key: string) {
    const element = document.querySelector(`[data-toast-key="${key}"]`);
    if (element) {
      element.classList.add('closing');
    }
    setTimeout(() => {
      super.close(key);
    }, 200);
  }
}

export const notificationQueue = new CustomQueue<NotificationContent>({
  maxVisibleToasts: 100,
});

const TIMEOUTS: Partial<Record<NotificationContent['type'], number>> = {
  info: 5000,
  success: 5000,
};

function showNotificationWithType(type: NotificationContent['type']) {
  return function (message: ReactNode) {
    const timeout = TIMEOUTS[type];
    const { resolve, reject, promise } =
      type === 'countdown'
        ? Promise.withResolvers()
        : { promise: Promise.resolve() };
    const id = notificationQueue.add(
      { content: message, type, promise: { resolve, reject } },
      {
        timeout,
        onClose: () => {
          if (type === 'countdown') {
            reject?.();
          }
        },
      },
    );

    return {
      id,
      hide: () => {
        notificationQueue.close(id);
      },
      promise,
    };
  };
}

export const showErrorNotification = showNotificationWithType('error');
export const showInfoNotification = showNotificationWithType('info');
export const showSuccessNotification = showNotificationWithType('success');
export const showPendingNotification = showNotificationWithType('pending');
export const showWarningNotification = showNotificationWithType('warning');
export const showTooltipNotification = showNotificationWithType('tooltip');
export const showCountdownNotification = showNotificationWithType('countdown');
export const showProgressNotification = showNotificationWithType('progress');
