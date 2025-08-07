import type { ToastState } from '@react-stately/toast';
import type { AriaToastProps } from '@react-aria/toast';
import { useToast as useAriaToast } from '@react-aria/toast';
import { useEffect, useRef } from 'react';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { PressResponder } from '@react-aria/interactions';
import { NotificationContent, notificationQueue } from './queue';
import { Spinner } from '@restate/ui/loading';

interface ToastProps extends AriaToastProps<NotificationContent> {
  state: ToastState<NotificationContent>;
  className?: string;
}

const styles = tv({
  base: 'peer absolute top-0 right-0 left-0 z-80 flex min-h-10 flex-auto shrink-0 transform items-center gap-2 rounded-xl border py-1 pr-1 pl-3 text-sm shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition duration-300 [&:first-child+*]:z-70 [&:first-child+*]:-translate-y-1 [&:first-child+*]:scale-95 [&:first-child+*+*]:z-60 [&:first-child+*+*]:-translate-y-1.5 [&:first-child+*+*]:scale-90 [&:first-child+*+*~*]:z-60 [&:first-child+*+*~*]:scale-50',
  slots: {
    content: 'flex-auto',
    close: 'ml-auto text-inherit',
    icon: 'h-4 w-4 shrink-0',
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
        base: 'z-0 animate-out fade-out slide-out-to-top-16 [&:first-child+*]:translate-y-0 [&:first-child+*]:scale-100',
      },
    },
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
    ({ key }) => key === props.toast.key,
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
        <Button
          {...closeButtonProps}
          onClick={closeButtonProps.onPress}
          variant="icon"
          className={close()}
        >
          <Icon name={IconName.X} />
        </Button>
      </PressResponder>
    </div>
  );
}
