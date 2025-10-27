import {
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastContent as ToastContent,
  Text,
} from 'react-aria-components';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { NotificationContent } from './queue';
import { Spinner } from '@restate/ui/loading';
import type { QueuedToast } from 'react-aria-components';

interface NotificationProps {
  toast: QueuedToast<NotificationContent>;
  className?: string;
}

const styles = tv({
  base: 'peer absolute top-0 right-0 left-0 z-80 mx-10 flex min-h-10 flex-auto shrink-0 transform items-center gap-2 rounded-xl border py-1 pr-1 pl-3 text-sm shadow-lg shadow-zinc-800/5 backdrop-blur-xl backdrop-saturate-200 transition duration-300 animate-in fade-in slide-in-from-top-16 zoom-in-95 [&.closing]:duration-250 [&.closing]:animate-out [&.closing]:fade-out [&.closing]:slide-out-to-top-16',
  slots: {
    content: 'flex-auto',
    close: 'ml-auto text-inherit',
    icon: 'h-4 w-4 shrink-0',
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

export function Notification({ toast, className }: NotificationProps) {
  const { base, content, close, icon } = styles({
    className,
    type: toast.content.type,
  });

  return (
    <Toast toast={toast} className={base()} data-toast-key={toast.key}>
      <ToastContent className={content()}>
        <div className="flex items-center gap-2">
          <NotificationIcon type={toast.content.type} className={icon()} />
          <Text slot="title">{toast.content.content}</Text>
        </div>
      </ToastContent>
      <Button slot="close" variant="icon" className={close()}>
        <Icon name={IconName.X} />
      </Button>
    </Toast>
  );
}
