import { PropsWithChildren } from 'react';
// import styles from './AppBar.module.css';

interface NotificationProps {
  id?: string;
}

export function Notification(props: PropsWithChildren<NotificationProps>) {
  return (
    <output
      className='mx-4 -translate-y-96 [&:has(>*)]:translate-y-0 [&>[data-variant]]:hidden [&:has(>*)]:top-20 sm:[&:has(>*)]:top-24 [&:has(>*)]:animate-in [&>*]:flex-auto [&:has([data-variant="hidden"])]:animate-out [&:has(>*)]:slide-in-from-top-16 [&:has([data-variant="hidden"])]:slide-out-to-top-16 duration-300 sticky z-30 flex flex-none flex-wrap items-stretch justify-between backdrop-blur-xl backdrop-saturate-200 h-10 shadow-lg shadow-zinc-800/5 rounded-xl'
      {...props}
    ></output>
  );
}

export function HideNotification() {
  return <div className="hidden" data-variant="hidden" />;
}
