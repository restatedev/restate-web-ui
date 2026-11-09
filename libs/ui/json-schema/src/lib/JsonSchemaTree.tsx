import { useMemo, useState, type ReactNode } from 'react';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import {
  buildSchemaTree,
  hasSchemaDetails,
  refName,
  type JsonSchema,
  type SchemaNode,
  type SchemaViewMode,
} from '@restate/util-openapi';
import { MarkdownDescription } from './MarkdownDescription';

export interface JsonSchemaTreeProps {
  schema?: JsonSchema;
  root?: unknown;
  mode?: SchemaViewMode;
  defaultExpandedDepth?: number;
  className?: string;
  emptyText?: ReactNode;
}

function formatValue(value: unknown) {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

const chipStyles = tv({
  base: 'inline-flex items-center rounded bg-muted px-1 py-px font-sans text-2xs leading-4 font-medium text-tertiary',
});

function Chip({ children }: { children: ReactNode }) {
  return <span className={chipStyles()}>{children}</span>;
}

function ValueList({ label, values }: { label: string; values: unknown[] }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1">
      <span className="text-2xs text-muted">{label}:</span>
      {values.map((value, index) => (
        <code
          key={index}
          className="max-w-full truncate rounded border border-inset bg-inset px-1 font-mono text-2xs text-secondary"
          title={formatValue(value)}
        >
          {formatValue(value)}
        </code>
      ))}
    </div>
  );
}

function NodeDetails({ node }: { node: SchemaNode }) {
  const hasValues =
    node.constValue !== undefined ||
    node.allowedValues !== undefined ||
    node.defaultValue !== undefined ||
    node.examples !== undefined ||
    node.pattern !== undefined ||
    node.constraints.length > 0 ||
    node.rules.length > 0 ||
    Boolean(node.error);

  if (!node.description && !hasValues) {
    return null;
  }
  return (
    <div className="mt-0.5 flex flex-col gap-1 text-xs">
      {node.description && (
        <MarkdownDescription collapsible>
          {node.description}
        </MarkdownDescription>
      )}
      {node.constraints.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.constraints.map((constraint) => (
            <Chip key={constraint}>{constraint}</Chip>
          ))}
        </div>
      )}
      {node.constValue && (
        <ValueList label="Constant" values={[node.constValue.value]} />
      )}
      {node.allowedValues && node.allowedValues.length > 0 && (
        <ValueList
          label={
            node.allowedValues.length === 1 ? 'Allowed value' : 'Allowed values'
          }
          values={node.allowedValues}
        />
      )}
      {node.defaultValue && (
        <ValueList label="Default" values={[node.defaultValue.value]} />
      )}
      {node.examples && (
        <ValueList
          label={node.examples.length === 1 ? 'Example' : 'Examples'}
          values={node.examples}
        />
      )}
      {node.pattern && <ValueList label="Pattern" values={[node.pattern]} />}
      {node.rules.map(({ keyword, value }) => (
        <ValueList key={keyword} label={keyword} values={[value]} />
      ))}
      {node.error && (
        <div className="flex items-center gap-1 text-danger">
          <Icon name={IconName.TriangleAlert} className="h-3 w-3" />
          {node.error}
        </div>
      )}
    </div>
  );
}

const toggleStyles = tv({
  base: 'group/toggle flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded text-left outline-offset-2 outline-focus focus-visible:outline-2',
});

const caretStyles = tv({
  base: 'h-3 w-3 shrink-0 self-center text-subtle transition-transform group-hover/toggle:text-secondary',
  variants: { isExpanded: { true: 'rotate-90' } },
});

function canExpandNode(node: SchemaNode) {
  return node.children.length > 0 || Boolean(node.variants);
}

const typeStyles = tv({
  base: 'font-mono break-all',
  variants: {
    isRoot: {
      true: 'text-0.5xs font-medium text-secondary',
      false: 'text-2xs text-muted',
    },
  },
});

function NodeHeader({
  node,
  toggle,
}: {
  node: SchemaNode;
  toggle?: { isExpanded: boolean; onToggle: () => void };
}) {
  const label = (
    <>
      {node.name && (
        <span className="font-mono text-0.5xs font-medium break-all text-secondary">
          {node.name}
        </span>
      )}
      <span className={typeStyles({ isRoot: !node.name })}>{node.type}</span>
    </>
  );
  return (
    <div className="flex min-w-0 items-baseline gap-x-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        {toggle ? (
          <button
            type="button"
            className={toggleStyles()}
            aria-expanded={toggle.isExpanded}
            aria-label={`${toggle.isExpanded ? 'Collapse' : 'Expand'} ${node.name ?? 'schema'}`}
            onClick={toggle.onToggle}
          >
            {label}
            <Icon
              name={IconName.ChevronRight}
              className={caretStyles({ isExpanded: toggle.isExpanded })}
            />
          </button>
        ) : (
          label
        )}
        {node.recursiveRef && (
          <Chip>recursive: {refName(node.recursiveRef)}</Chip>
        )}
        {node.nullable && <Chip>nullable</Chip>}
        {node.readOnly && <Chip>read-only</Chip>}
        {node.writeOnly && <Chip>write-only</Chip>}
      </div>
      {(node.deprecated || node.required) && (
        <div className="ml-auto flex shrink-0 gap-2 text-2xs font-medium">
          {node.deprecated && <span className="text-danger">deprecated</span>}
          {node.required && <span className="text-warning">required</span>}
        </div>
      )}
    </div>
  );
}

const variantButtonStyles = tv({
  base: 'rounded-md px-2 py-0.5 text-0.5xs font-medium outline-offset-2 outline-focus focus-visible:outline-2',
  variants: {
    isSelected: {
      true: 'bg-raised text-primary shadow-xs ring-1 ring-tint',
      false: 'text-muted hover:bg-tint-subtle hover:text-secondary',
    },
  },
});

function Variants({
  node,
  depth,
  defaultExpandedDepth,
}: {
  node: SchemaNode;
  depth: number;
  defaultExpandedDepth: number;
}) {
  const [selected, setSelected] = useState(0);
  if (!node.variants) {
    return null;
  }
  const label = node.variants.keyword === 'oneOf' ? 'One of' : 'Any of';
  const option = node.variants.options[selected] ?? node.variants.options[0];
  return (
    <div className="mt-3 flex flex-col gap-2 first:mt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-secondary">{label}</span>
        <div
          role="group"
          aria-label={label}
          className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-tint-subtle p-0.5"
        >
          {node.variants.options.map((variant, index) => (
            <button
              key={variant.node.id}
              type="button"
              aria-pressed={index === selected}
              className={variantButtonStyles({
                isSelected: index === selected,
              })}
              onClick={() => setSelected(index)}
            >
              {variant.label}
            </button>
          ))}
        </div>
      </div>
      {option && (
        <div>
          <NodeDetails node={option.node} />
          {option.node.children.length === 0 && !option.node.variants && (
            <div className="font-mono text-2xs text-muted">
              {option.node.type}
            </div>
          )}
          <Children
            nodes={option.node.children}
            depth={depth}
            defaultExpandedDepth={defaultExpandedDepth}
          />
          {option.node.variants && (
            <Variants
              node={option.node}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Children({
  nodes,
  depth,
  defaultExpandedDepth,
}: {
  nodes: SchemaNode[];
  depth: number;
  defaultExpandedDepth: number;
}) {
  if (nodes.length === 0) {
    return null;
  }
  return (
    <ul className={childrenStyles({ isNested: depth > 0 })}>
      {nodes.map((child) => (
        <SchemaRow
          key={child.id}
          node={child}
          depth={depth}
          defaultExpandedDepth={defaultExpandedDepth}
        />
      ))}
    </ul>
  );
}

const childrenStyles = tv({
  base: 'flex flex-col',
  variants: {
    isNested: { true: 'ml-2 border-l border-muted pl-3' },
  },
});

function SchemaRow({
  node,
  depth,
  defaultExpandedDepth,
}: {
  node: SchemaNode;
  depth: number;
  defaultExpandedDepth: number;
}) {
  const canExpand = canExpandNode(node);
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpandedDepth);

  return (
    <li className="py-1.5">
      <NodeHeader
        node={node}
        toggle={
          canExpand
            ? {
                isExpanded,
                onToggle: () => setIsExpanded((value) => !value),
              }
            : undefined
        }
      />
      <NodeDetails node={node} />
      {canExpand && isExpanded && (
        <div className="mt-1">
          <Children
            nodes={node.children}
            depth={depth + 1}
            defaultExpandedDepth={defaultExpandedDepth}
          />
          {node.variants && (
            <Variants
              node={node}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
            />
          )}
        </div>
      )}
    </li>
  );
}

const treeStyles = tv({
  base: 'min-w-0 text-sm',
  variants: { isEmpty: { true: 'text-xs text-muted' } },
});

export function JsonSchemaTree({
  schema,
  root,
  mode = 'standalone',
  defaultExpandedDepth = 1,
  className,
  emptyText = 'Any JSON value',
}: JsonSchemaTreeProps) {
  const tree = useMemo(
    () => buildSchemaTree(schema, { root, mode }),
    [schema, root, mode],
  );

  if (!hasSchemaDetails(tree) && tree.type === 'any' && !tree.error) {
    return (
      <div className={treeStyles({ className, isEmpty: true })}>
        {emptyText}
      </div>
    );
  }

  const isPlainObject =
    tree.children.length > 0 && !tree.variants && tree.kind === 'root';
  const showsHeader = !isPlainObject && !(tree.variants && !tree.title);

  return (
    <div className={treeStyles({ className })}>
      {isPlainObject &&
        (tree.type.startsWith('array') ||
          tree.type.startsWith('dictionary')) && (
          <div className="mb-1 font-mono text-2xs text-muted">{tree.type}</div>
        )}
      {showsHeader && <NodeHeader node={tree} />}
      <NodeDetails node={{ ...tree, examples: undefined }} />
      <Children
        nodes={tree.children}
        depth={0}
        defaultExpandedDepth={defaultExpandedDepth}
      />
      {tree.variants && (
        <Variants
          node={tree}
          depth={0}
          defaultExpandedDepth={defaultExpandedDepth}
        />
      )}
    </div>
  );
}
