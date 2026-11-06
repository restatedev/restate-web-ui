import { useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import { tv } from '@restate/util-styles';

const COMPONENTS: Components = {
  a: ({ href, children }) => {
    const isExternal = Boolean(
      href && /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href),
    );
    return (
      <a
        href={href}
        className="text-accent underline decoration-accent/60 hover:decoration-accent"
        {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-px font-mono text-[0.9em] text-secondary">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-1.5 overflow-auto rounded-lg border bg-inset p-2 font-mono text-xs [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  img: () => null,
};

const styles = tv({
  base: 'min-w-0 text-muted [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-1.5 [&_ul]:list-disc',
});

function firstParagraph(text: string) {
  const trimmed = text.trim();
  const index = trimmed.search(/\n\s*\n/);
  return index === -1 ? trimmed : trimmed.slice(0, index);
}

export function MarkdownDescription({
  children,
  className,
  collapsible = false,
}: {
  children: string;
  className?: string;
  collapsible?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = collapsible ? firstParagraph(children) : children;
  const isTruncated = collapsible && summary !== children.trim();

  return (
    <div className={styles({ className })}>
      <Markdown components={COMPONENTS} skipHtml>
        {isExpanded || !isTruncated ? children : summary}
      </Markdown>
      {isTruncated && (
        <button
          type="button"
          className="mt-0.5 text-xs text-accent hover:underline"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
