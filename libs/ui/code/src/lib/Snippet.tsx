import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Children, PropsWithChildren, ReactNode, memo, useState } from 'react';
import { tv } from '@restate/util-styles';
import { syntaxHighlighter } from './SyntaxHighlighter';
import { Nav, NavButtonItem } from '@restate/ui-nav';

interface SnippetProps {
  className?: string;
  language?:
    | 'typescript'
    | 'java'
    | 'json'
    | 'bash'
    | 'python'
    | 'go'
    | 'kotlin';
}

const LANGUAGE_LABEL: Record<
  Exclude<SnippetProps['language'], undefined>,
  string
> = {
  typescript: 'Typescript',
  java: 'Java',
  json: 'json',
  bash: 'bash',
  python: 'Python',
  go: 'Go',
  kotlin: 'Kotlin',
};

function SyntaxHighlighter({
  code,
  language,
}: {
  code: string;
  language: Exclude<SnippetProps['language'], undefined>;
}) {
  return (
    <span
      className="hljs"
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
  base: 'group/snippet flex items-start',
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
      {!!codes && (
        <OptimizedSyntaxHighlighter language={language} code={codes} />
      )}
      {others}
    </span>
  );
}

interface SnippetCopyProps {
  className?: string;
  copyText: string;
  size?: 'xs' | 'sm' | 'md';
}

const snippetCopyStyles = tv({
  base: 'copy items-center gap-1',
  variants: {
    hasSize: {
      true: 'ml-auto',
      false: 'absolute top-1 right-1 p-2 text-xs',
    },
  },
});
export function SnippetCopy({
  className,
  copyText,
  size,
  children,
}: PropsWithChildren<SnippetCopyProps>) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Button
      variant="icon"
      aria-label={children ? undefined : isCopied ? 'Copied' : 'Copy'}
      size={size}
      className={snippetCopyStyles({ hasSize: Boolean(size), className })}
      onClick={() => {
        navigator.clipboard.writeText(copyText);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      }}
    >
      {children}
      {isCopied ? (
        <Icon name={IconName.Check} size={size} />
      ) : (
        <Icon name={IconName.Copy} size={size} />
      )}
    </Button>
  );
}

const snippetTabsStyles = tv({
  base: '@container relative',
});
export function SnippetTabs({
  children,
  className,
  languages,
  defaultLanguage,
}: {
  className?: string;
  languages: Exclude<SnippetProps['language'], undefined>[];
  defaultLanguage: Exclude<SnippetProps['language'], undefined>;
  children: (
    language: Exclude<SnippetProps['language'], undefined>,
  ) => ReactNode;
}) {
  const [currentLanguage, setCurrentLanguage] =
    useState<(typeof languages)[number]>(defaultLanguage);
  return (
    <div
      className={snippetTabsStyles({
        className,
      })}
    >
      <div className="absolute top-0 right-0 rounded-xl bg-tint-subtle">
        <Nav ariaCurrentValue="true" className="gap-0">
          {languages.map((language) => (
            <NavButtonItem
              key={language}
              isActive={language === currentLanguage}
              onClick={() => setCurrentLanguage(language)}
            >
              {LANGUAGE_LABEL[language]}
            </NavButtonItem>
          ))}
        </Nav>
      </div>
      <div className="pt-8 @sm:pt-4 @lg:pt-0">{children(currentLanguage)}</div>
    </div>
  );
}
