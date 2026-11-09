import { useState } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  table: ({ children }) => (
    <div className="my-1.5 overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b px-2 py-1 font-medium text-secondary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-muted px-2 py-1">{children}</td>
  ),
};

interface MarkdownNode {
  type: string;
  value?: string;
  children?: MarkdownNode[];
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function htmlToText(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|[a-z]+);/gi, (entity, name: string) =>
      name.startsWith('#')
        ? String.fromCharCode(Number(name.slice(1)))
        : (ENTITIES[name.toLowerCase()] ?? entity),
    )
    .replace(/\s+/g, ' ')
    .trim();
}

const FLOW_PARENTS = new Set(['root', 'blockquote', 'listItem']);

function htmlAsText() {
  const visit = (node: MarkdownNode) => {
    node.children = node.children?.flatMap((child) => {
      if (child.type !== 'html') {
        visit(child);
        return [child];
      }
      const text = htmlToText(child.value ?? '');
      if (!text) {
        return [];
      }
      const textNode = { type: 'text', value: text };
      return FLOW_PARENTS.has(node.type)
        ? [{ type: 'paragraph', children: [textNode] }]
        : [textNode];
    });
  };
  return visit;
}

const REMARK_PLUGINS = [remarkGfm, htmlAsText];

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
      <Markdown components={COMPONENTS} remarkPlugins={REMARK_PLUGINS}>
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
