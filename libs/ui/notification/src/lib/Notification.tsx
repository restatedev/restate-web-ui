import {
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  Text,
} from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { NotificationContent } from './queue';
import { Ellipsis, Spinner } from '@restate/ui/loading';
import type { QueuedToast } from 'react-aria-components';
import { useEffect, useState } from 'react';
import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';

interface NotificationProps {
  toast: QueuedToast<NotificationContent>;
  className?: string;
  queue: ToastQueue<NotificationContent>;
}

const styles = tv({
  base: 'peer absolute top-0 right-0 left-0 z-80 mx-10 flex min-h-10 flex-auto shrink-0 transform items-center gap-2 rounded-xl border py-1 pr-1 pl-3 text-sm shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition duration-300 animate-in outline-none fade-in slide-in-from-top-16 zoom-in-95 [&.closing]:duration-250 [&.closing]:animate-out [&.closing]:fade-out [&.closing]:slide-out-to-top-16',
  slots: {
    content: 'flex-auto',
    close: 'ml-auto text-inherit',
    icon: 'h-4 w-4 shrink-0',
    animation:
      'pointer-events-none absolute bottom-0 left-0 z-[-1] h-1 w-0 transform rounded-xl transition',
  },
  variants: {
    type: {
      error: {
        base: 'border-red-300/30 bg-red-200/90 text-red-800',
        content: '',
        icon: '',
        close: '',
      },
      info: {
        base: 'border-sky-300/30 bg-sky-200/90 text-sky-800',
        content: '',
        icon: '',
        close: '',
      },
      progress: {
        base: 'border-sky-300/30 bg-sky-200/90 text-sky-800',
        content: '',
        icon: '',
        close: '',
      },
      pending: {
        base: 'border-orange-300/30 bg-orange-200/90 text-orange-800',
        content: '',
        icon: '',
        close: '',
      },
      success: {
        base: 'border-green-400/30 bg-green-200/90 text-green-800',
        content: '',
        icon: '',
        close: '',
      },
      warning: {
        base: 'border-orange-300/30 bg-orange-200/90 text-orange-800',
        content: '',
        icon: '',
        close: '',
      },
      tooltip: {
        base: 'border border-zinc-900/80 bg-zinc-800/90 text-gray-300 shadow-[inset_0_0.5px_0_0_var(--color-gray-500)]! shadow-gray-500 drop-shadow-xl',
        content: '',
        icon: '',
        close: '',
      },
      countdown: {
        base: 'overflow-hidden border-sky-300/30 bg-sky-200/90 text-sky-800',
        content: '',
        icon: '',
        close: '',
        animation: 'animate-countdown bg-sky-600/50 duration-3000',
      },
    },
  },
});

function NotificationIcon({
  type,
  className,
}: {
  type: NotificationContent['type'];
  className?: string;
}) {
  switch (type) {
    case 'warning':
      return <Icon name={IconName.TriangleAlert} className={className} />;
    case 'info':
      return <Icon name={IconName.Info} className={className} />;
    case 'success':
      return <Icon name={IconName.Check} className={className} />;
    case 'error':
      return <Icon name={IconName.CircleX} className={className} />;
    case 'pending':
      return <Spinner className={className} />;

    default:
      return null;
  }
}

export function Notification({ toast, className, queue }: NotificationProps) {
  const { base, content, close, icon, animation } = styles({
    className,
    type: toast.content.type,
  });
  const isCountdown = toast.content.type === 'countdown';
  const isProgress = toast.content.type === 'progress';
  const { countdown, isPending } = useCountdownNotification(
    isCountdown,
    toast.content.promise?.resolve,
  );

  return (
    <Toast toast={toast} className={base()} data-toast-key={toast.key}>
      <div className={animation()} />
      <ToastContent className={content()}>
        <div className="flex items-center gap-2">
          <NotificationIcon type={toast.content.type} className={icon()} />
          <Text slot="title" className="flex-auto">
            {toast.content.content}
            {isCountdown &&
              (countdown ? (
                <span className="pl-1">
                  (in <span className="font-semibold">{countdown}s</span>)
                </span>
              ) : (
                <Ellipsis />
              ))}
          </Text>
        </div>
      </ToastContent>
      {!isCountdown && !isProgress && (
        <Button slot="close" variant="icon" className={close()}>
          <Icon name={IconName.X} />
        </Button>
      )}
      {isCountdown && !isPending && (
        <Button
          slot="close"
          variant="secondary"
          autoFocus
          disabled={isPending}
          className={'px-2 py-1'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              queue.close(toast.key);
            }
          }}
        >
          Undo
        </Button>
      )}
      {isCountdown && isPending && <Spinner className="mr-1" />}
    </Toast>
  );
}

function useCountdownNotification(
  enabled = false,
  onFinish?: (value: unknown) => void,
) {
  const [countdown, setCountdown] = useState(3);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (countdown && enabled) {
      timer = setTimeout(() => {
        setCountdown(Math.max(countdown - 1, 0));
        if (countdown === 1) {
          setIsPending(true);
          onFinish?.(true);
        }
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [enabled, countdown, onFinish]);

  return enabled ? { countdown, isPending } : {};
}
