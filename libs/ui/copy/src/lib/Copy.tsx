import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren, useState } from 'react';
import { tv } from 'tailwind-variants';

interface CopyProps {
  className?: string;
  copyText: string;
}

const copyStyles = tv({
  base: 'copy flex-shrink-0 flex items-center gap-1 ml-auto p-2 text-xs',
});
export function Copy({ className, copyText }: PropsWithChildren<CopyProps>) {
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
