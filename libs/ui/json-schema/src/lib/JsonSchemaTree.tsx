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
  base: 'inline-flex items-center rounded px-1 py-px font-sans text-2xs leading-4 font-medium',
  variants: {
    tone: {
      neutral: 'bg-muted text-tertiary',
      required: 'bg-warning-subtle text-warning-strong',
      deprecated: 'bg-danger-subtle text-danger-strong',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'required' | 'deprecated';
}) {
  return <span className={chipStyles({ tone })}>{children}</span>;
}

function ValueList({ label, values }: { label: string; values: unknown[] }) {
  return (
    <div className="flex flex-wrap items-baseline gap-1">
      <span className="text-2xs text-muted">{label}</span>
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
  base: 'flex h-4 w-4 shrink-0 items-center justify-center rounded text-subtle outline-offset-2 outline-focus hover:bg-tint hover:text-secondary focus-visible:outline-2',
});

const caretStyles = tv({
  base: 'h-3 w-3 transition-transform',
  variants: { isExpanded: { true: 'rotate-90' } },
});

function canExpandNode(node: SchemaNode) {
  return node.children.length > 0 || Boolean(node.variants);
}

const detailsStyles = tv({
  base: '',
  variants: { hasToggleColumn: { true: 'pl-5.5' } },
});

function NodeHeader({
  node,
  isExpanded,
  onToggle,
  canExpand,
  hasToggleColumn,
}: {
  node: SchemaNode;
  isExpanded: boolean;
  onToggle: () => void;
  canExpand: boolean;
  hasToggleColumn: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {canExpand ? (
        <button
          type="button"
          className={toggleStyles()}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name ?? 'schema'}`}
          onClick={onToggle}
        >
          <Icon
            name={IconName.ChevronRight}
            className={caretStyles({ isExpanded })}
          />
        </button>
      ) : hasToggleColumn ? (
        <span className="w-4 shrink-0" />
      ) : null}
      {node.name && (
        <span className="font-mono text-0.5xs font-semibold break-all text-primary">
          {node.name}
        </span>
      )}
      <span className="font-mono text-0.5xs break-all text-muted">
        {node.type}
      </span>
      {node.recursiveRef && (
        <Chip>recursive: {refName(node.recursiveRef)}</Chip>
      )}
      {node.nullable && <Chip>nullable</Chip>}
      {node.readOnly && <Chip>read-only</Chip>}
      {node.writeOnly && <Chip>write-only</Chip>}
      {node.deprecated && <Chip tone="deprecated">deprecated</Chip>}
      {node.required && <Chip tone="required">required</Chip>}
    </div>
  );
}

const variantButtonStyles = tv({
  base: 'rounded-md px-1.5 py-0.5 font-mono text-2xs outline-offset-2 outline-focus focus-visible:outline-2',
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
  const option = node.variants.options[selected] ?? node.variants.options[0];
  return (
    <div className="mt-1 flex flex-col gap-1">
      <div
        role="group"
        aria-label={node.variants.keyword === 'oneOf' ? 'One of' : 'Any of'}
        className="flex flex-wrap items-center gap-0.5 self-start rounded-lg bg-tint-subtle p-0.5"
      >
        <span className="px-1 text-2xs text-subtle">
          {node.variants.keyword === 'oneOf' ? 'one of' : 'any of'}
        </span>
        {node.variants.options.map((variant, index) => (
          <button
            key={variant.node.id}
            type="button"
            aria-pressed={index === selected}
            className={variantButtonStyles({ isSelected: index === selected })}
            onClick={() => setSelected(index)}
          >
            {variant.label}
          </button>
        ))}
      </div>
      {option && (
        <div>
          <NodeDetails node={option.node} />
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
  const hasToggleColumn = nodes.some(canExpandNode);
  return (
    <ul className="flex flex-col">
      {nodes.map((child) => (
        <SchemaRow
          key={child.id}
          node={child}
          depth={depth}
          defaultExpandedDepth={defaultExpandedDepth}
          hasToggleColumn={hasToggleColumn}
        />
      ))}
    </ul>
  );
}

function SchemaRow({
  node,
  depth,
  defaultExpandedDepth,
  hasToggleColumn,
}: {
  node: SchemaNode;
  depth: number;
  defaultExpandedDepth: number;
  hasToggleColumn: boolean;
}) {
  const canExpand = canExpandNode(node);
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpandedDepth);

  return (
    <li className="border-t border-muted py-1.5 first:border-t-0">
      <NodeHeader
        node={node}
        canExpand={canExpand}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((value) => !value)}
        hasToggleColumn={hasToggleColumn}
      />
      <div className={detailsStyles({ hasToggleColumn })}>
        <NodeDetails node={node} />
        {canExpand && isExpanded && (
          <div className="mt-1 border-l border-default pl-3">
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
      </div>
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

  return (
    <div className={treeStyles({ className })}>
      {isPlainObject ? (
        <>
          {tree.description && (
            <MarkdownDescription className="mb-1 text-xs" collapsible>
              {tree.description}
            </MarkdownDescription>
          )}
          {tree.type.startsWith('array') ||
          tree.type.startsWith('dictionary') ? (
            <div className="mb-1 font-mono text-0.5xs text-muted">
              {tree.type}
            </div>
          ) : null}
          <Children
            nodes={tree.children}
            depth={0}
            defaultExpandedDepth={defaultExpandedDepth}
          />
        </>
      ) : (
        <>
          <NodeHeader
            node={tree}
            canExpand={false}
            isExpanded
            onToggle={() => undefined}
            hasToggleColumn={false}
          />
          <div>
            <NodeDetails node={tree} />
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
        </>
      )}
    </div>
  );
}
