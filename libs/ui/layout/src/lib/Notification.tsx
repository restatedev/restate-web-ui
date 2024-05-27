import { PropsWithChildren } from 'react';
// import styles from './AppBar.module.css';

interface NotificationProps {
  id?: string;
}

export function Notification(props: PropsWithChildren<NotificationProps>) {
  return (
    <output
      className='mx-4 -translate-y-96 [&:has(>*)]:translate-y-0 [&:has(>*)]:top-20 sm:[&:has(>*)]:top-24 [&:has(>*)]:animate-in [&>*]:flex-auto [&>[data-variant]]:hidden [&:has(>*)]:slide-in-from-top duration-300 [&:has([data-variant="hidden"])]:translate-y-96 sticky z-30 flex flex-none flex-wrap items-stretch justify-between backdrop-blur-xl backdrop-saturate-200 h-10 shadow-lg shadow-zinc-800/5 rounded-xl'
      {...props}
    ></output>
  );
}
