import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Children, PropsWithChildren, memo, useState } from 'react';
import { tv } from 'tailwind-variants';
import { syntaxHighlighter } from './SyntaxHighlighter';

interface SnippetProps {
  className?: string;
  language?: 'typescript' | 'java' | 'json' | 'bash';
}

function SyntaxHighlighter({
  code,
  language,
}: {
  code: string;
  language: Exclude<SnippetProps['language'], undefined>;
}) {
  return (
    <span
      className="py-1 group-has-[.copy]/snippet:py-2"
      dangerouslySetInnerHTML={{
        __html: syntaxHighlighter.highlight(code, {
          language,
          ignoreIllegals: false,
        }).value,
      }}
    />
  );
}

const OptimizedSyntaxHighlighter = memo(SyntaxHighlighter);

const snippetStyles = tv({
  base: 'flex gap-2 gap-x-2 items-start group/snippet p-2 py-0 has-[.copy]:-my-1 has-[.copy]:pr-1 [&:not(:has(.copy))]:group-has-[.copy]/code:pr-16 [&_.copy]:-mr-2',
});
export function Snippet({
  children,
  className,
  language = 'bash',
}: PropsWithChildren<SnippetProps>) {
  const childrenArray = Children.toArray(children);
  const codes = childrenArray
    .filter((child) => typeof child === 'string')
    .join('');
  const others = childrenArray.filter((child) => typeof child !== 'string');
  return (
    <span
      className={snippetStyles({
        className,
      })}
    >
      <OptimizedSyntaxHighlighter language={language} code={codes} />
      {others}
    </span>
  );
}

interface SnippetCopyProps {
  className?: string;
  copyText: string;
}

const snippetCopyStyles = tv({
  base: 'copy flex-shrink-0 flex items-center gap-1 ml-auto p-2',
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
