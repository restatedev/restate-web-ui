import type { ToastState } from '@react-stately/toast';
import type { AriaToastProps } from '@react-aria/toast';
import { useToast as useAriaToast } from '@react-aria/toast';
import { useEffect, useRef } from 'react';
import { Button, Spinner } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { PressResponder } from '@react-aria/interactions';
import { NotificationContent, notificationQueue } from './queue';

interface ToastProps extends AriaToastProps<NotificationContent> {
  state: ToastState<NotificationContent>;
  className?: string;
}

const styles = tv({
  base: 'absolute peer z-[80] [&:first-child+*]:scale-95 [&:first-child+*]:z-[70] [&:first-child+*+*]:scale-90 [&:first-child+*+*~*]:scale-50 [&:first-child+*+*~*]:z-[60] [&:first-child+*+*]:z-[60] top-0 [&:first-child+*]:-translate-y-1 [&:first-child+*+*]:-translate-y-1.5 left-0 right-0 flex shrink-0 duration-300 items-center gap-2 flex-auto pl-3 pr-1 py-1 text-sm border rounded-xl backdrop-blur-xl backdrop-saturate-200 min-h-10 shadow-lg shadow-zinc-800/5 transform transition',
  slots: {
    content: 'flex-auto',
    close: 'ml-auto text-inherit',
    icon: 'w-4 h-4 shrink-0',
  },
  variants: {
    animation: {
      queued: {
        base: 'animate-in fade-in slide-in-from-top-16 zoom-in-95',
      },
      entering: {
        base: 'animate-in fade-in slide-in-from-top-16 zoom-in-95',
      },
      exiting: {
        base: 'z-0 animate-out fade-out slide-out-to-top-16 [&:first-child+*]:scale-100 [&:first-child+*]:translate-y-0',
      },
    },
    type: {
      error: {
        base: 'bg-red-200/90 border-red-300/30 text-red-800',
        content: '',
        icon: '',
        close: '',
      },
      info: {
        base: 'bg-sky-200/90 border-sky-300/30 text-sky-800',
        content: '',
        icon: '',
        close: '',
      },
      pending: {
        base: 'bg-orange-200/90 border-orange-300/30 text-orange-800',
        content: '',
        icon: '',
        close: '',
      },
      success: {
        base: 'bg-green-200/90 border-green-400/30 text-green-800',
        content: '',
        icon: '',
        close: '',
      },
      warning: {
        base: 'bg-orange-200/90 border-orange-300/30 text-orange-800',
        content: '',
        icon: '',
        close: '',
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
      break;
  }
}

const TIMEOUTS: Partial<Record<NotificationContent['type'], number>> = {
  info: 5000,
  success: 5000,
};

export function Notification({ state, className, ...props }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { toastProps, contentProps, titleProps, closeButtonProps } =
    useAriaToast(props, state, ref);
  const { base, content, close, icon } = styles({
    className,
    type: props.toast.content.type,
    animation: props.toast.animation ?? 'entering',
  });
  const notificationIndex = state.visibleToasts.findIndex(
    ({ key }) => key === props.toast.key
  );
  const isVisible = notificationIndex === 0;
  const timeOut = TIMEOUTS[props.toast.content.type];

  useEffect(() => {
    let isCancelled = false;
    let timeOutRef: ReturnType<typeof setTimeout> | null = null;

    if (isVisible && timeOut) {
      timeOutRef = setTimeout(() => {
        if (!isCancelled) {
          notificationQueue.close(props.toast.key);
        }
      }, timeOut);
    }

    return () => {
      isCancelled = true;
      timeOutRef && clearTimeout(timeOutRef);
    };
  }, [isVisible, props.toast.key, timeOut]);

  useEffect(() => {
    let isCancelled = false;
    let timeOutRef: ReturnType<typeof setTimeout> | null = null;
    const element = ref.current;
    if (!(element instanceof HTMLElement)) return;

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-animation'
        ) {
          const value = element.getAttribute('data-animation');
          if (value === 'exiting') {
            // eslint-disable-next-line no-loop-func
            timeOutRef = setTimeout(() => {
              if (!isCancelled) {
                notificationQueue.remove(props.toast.key);
              }
            }, 290);
          }
        }
      }
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ['data-animation'],
    });

    return () => {
      isCancelled = true;
      timeOutRef && clearTimeout(timeOutRef);
      observer.disconnect();
    };
  }, [props.toast.key]);

  return (
    <div
      {...toastProps}
      ref={ref}
      className={base()}
      data-animation={props.toast.animation}
    >
      <div {...contentProps} className={content()}>
        <div {...titleProps} className="flex items-center gap-2">
          <NotificationIcon
            type={props.toast.content.type}
            className={icon()}
          />
          {props.toast.content.content}
        </div>
      </div>
      <PressResponder onPress={closeButtonProps.onPress}>
        <Button {...closeButtonProps} variant="icon" className={close()}>
          <Icon name={IconName.X} />
        </Button>
      </PressResponder>
    </div>
  );
}
