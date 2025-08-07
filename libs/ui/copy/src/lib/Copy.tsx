import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren, useState } from 'react';
import { tv } from '@restate/util/styles';

interface CopyProps {
  className?: string;
  copyText: string;
  onClick?: VoidFunction;
}

const copyStyles = tv({
  base: 'copy ml-auto flex shrink-0 items-center gap-1 p-2 text-xs',
});
export function Copy({
  className,
  copyText,
  onClick,
}: PropsWithChildren<CopyProps>) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Button
      variant="icon"
      className={copyStyles({ className })}
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
        <Icon name={IconName.Check} />
      ) : (
        <Icon name={IconName.Copy} />
      )}
    </Button>
  );
}
