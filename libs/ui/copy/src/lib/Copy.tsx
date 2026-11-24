import { Button } from '@restate/ui-button';
import { Icon, IconName, type IconTone } from '@restate/ui-icons';
import { PropsWithChildren, useState } from 'react';
import { tv } from '@restate/util-styles';

export type CopySize = '2xs' | 'xs' | 'sm' | 'md';

interface CopyProps {
  className?: string;
  copyText: string;
  onClick?: VoidFunction;
  size?: CopySize;
  tone?: IconTone;
}

const copyStyles = tv({
  base: 'copy flex shrink-0 items-center gap-1',
  variants: {
    hasSize: {
      true: '',
      false: 'ml-auto p-2 text-xs',
    },
  },
});
export function Copy({
  className,
  copyText,
  onClick,
  size,
  tone,
}: PropsWithChildren<CopyProps>) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Button
      variant="icon"
      aria-label={isCopied ? 'Copied' : 'Copy'}
      size={size}
      className={copyStyles({ hasSize: Boolean(size), className })}
      onClick={() => {
        navigator.clipboard.writeText(copyText);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
        onClick?.();
      }}
    >
      {isCopied ? (
        <Icon name={IconName.Check} size={size} tone={tone} />
      ) : (
        <Icon name={IconName.Copy} size={size} tone={tone} />
      )}
    </Button>
  );
}
