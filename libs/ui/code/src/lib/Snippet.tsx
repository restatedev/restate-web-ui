import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren, useState } from 'react';
import { tv } from 'tailwind-variants';

interface SnippetProps {
  className?: string;
}

const snippetStyles = tv({
  base: 'flex gap-2 items-start p-2 pb-0 [&:not(:has(.copy))]:group-has-[.copy]:pr-20 [&_.copy]:-mt-2 [&_[data-comment]]:text-green-800 [&_[data-shell-command]]:text-red-700',
});
export function Snippet({
  children,
  className,
}: PropsWithChildren<SnippetProps>) {
  return (
    <span
      className={snippetStyles({
        className,
      })}
    >
      {children}
    </span>
  );
}

interface SnippetCopyProps {
  className?: string;
  copyText: string;
}

const snippetCopyStyles = tv({
  base: 'copy flex-shrink-0 flex items-center gap-1 p-2 ml-auto',
});
export function SnippetCopy({
  className,
  copyText,
}: PropsWithChildren<SnippetCopyProps>) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Button
      variant="icon"
      className={snippetCopyStyles({ className })}
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
