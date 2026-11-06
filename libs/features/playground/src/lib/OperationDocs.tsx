import { useState, type ReactNode } from 'react';
import { JsonSchemaTree, MarkdownDescription } from '@restate/ui-json-schema';
import { tv } from '@restate/util-styles';
import {
  generateExample,
  stringifyExample,
  type ContractOperation,
  type ContractResponse,
} from '@restate/util-openapi';
import { Copy } from '@restate/ui-copy';
import { SegmentedControl } from './SegmentedControl';
import { responseLabel } from './status';

export function DocsSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-6 items-center gap-2">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <div className="ml-auto flex items-center gap-2">{aside}</div>
      </div>
      {children}
    </section>
  );
}

const panelStyles = tv({
  base: 'rounded-xl border bg-surface px-3 py-2',
});

function ResponseBody({
  response,
  root,
}: {
  response: ContractResponse;
  root: unknown;
}) {
  const [view, setView] = useState<'schema' | 'example'>('schema');
  const example =
    response.example !== undefined
      ? response.example
      : response.schema !== undefined &&
          response.contentType &&
          /json/i.test(response.contentType)
        ? generateExample(response.schema, { root, mode: 'response' })
        : undefined;
  const exampleText =
    example !== undefined ? stringifyExample(example) : undefined;
  const hasSchema = response.schema !== undefined;
  const current = hasSchema && view === 'schema' ? 'schema' : 'example';

  return (
    <div className="flex flex-col gap-2">
      {response.description && (
        <MarkdownDescription className="text-xs">
          {response.description}
        </MarkdownDescription>
      )}
      {response.contentType ? (
        <div className="rounded-xl border bg-surface">
          <div className="flex min-h-9 items-center gap-2 border-b border-muted py-1 pr-1 pl-3">
            <code className="font-mono text-2xs text-muted">
              {response.contentType}
            </code>
            <div className="ml-auto flex items-center gap-1">
              {hasSchema && exampleText !== undefined && (
                <SegmentedControl
                  label="Show"
                  value={current}
                  onChange={setView}
                  options={[
                    { value: 'schema', label: 'Schema' },
                    { value: 'example', label: 'Example' },
                  ]}
                />
              )}
              {current === 'example' && exampleText !== undefined && (
                <Copy copyText={exampleText} className="p-1.5" />
              )}
            </div>
          </div>
          <div className="px-3 py-2">
            {current === 'schema' ? (
              <JsonSchemaTree
                schema={response.schema}
                root={root}
                mode="read"
                emptyText="Any value"
              />
            ) : exampleText !== undefined ? (
              <pre className="max-h-72 overflow-auto font-mono text-xs text-secondary">
                {exampleText}
              </pre>
            ) : (
              <div className="text-xs text-muted">Any value</div>
            )}
          </div>
        </div>
      ) : response.description ? null : (
        <div className="text-xs text-muted">No body</div>
      )}
    </div>
  );
}

function Responses({
  responses,
  root,
}: {
  responses: ContractResponse[];
  root: unknown;
}) {
  const [selected, setSelected] = useState(responses[0]?.status ?? '');
  const response =
    responses.find(({ status }) => status === selected) ?? responses[0];
  if (!response) {
    return null;
  }
  return (
    <DocsSection
      title="Responses"
      aside={
        responses.length > 1 && (
          <SegmentedControl
            label="Response status"
            value={response.status}
            onChange={setSelected}
            options={responses.map(({ status }) => ({
              value: status,
              label: responseLabel(status),
            }))}
          />
        )
      }
    >
      <ResponseBody response={response} root={root} />
    </DocsSection>
  );
}

export function OperationDocs({
  operation,
  root,
}: {
  operation: ContractOperation;
  root: unknown;
}) {
  const body = operation.body;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DocsSection
        title="Request body"
        aside={
          body && (
            <span className="flex items-center gap-1.5 text-2xs text-muted">
              {body.required ? 'required' : 'optional'}
              <code className="font-mono">{body.contentType}</code>
            </span>
          )
        }
      >
        {body ? (
          <div className={panelStyles()}>
            {body.description && (
              <MarkdownDescription className="mb-1 text-xs">
                {body.description}
              </MarkdownDescription>
            )}
            <JsonSchemaTree
              schema={body.schema}
              root={root}
              mode="write"
              emptyText={
                /json/i.test(body.contentType)
                  ? 'Any JSON value'
                  : `Raw ${body.contentType} content`
              }
            />
          </div>
        ) : (
          <div className="text-xs text-muted">This handler takes no input.</div>
        )}
      </DocsSection>
      <Responses
        key={operation.id}
        responses={operation.responses}
        root={root}
      />
    </div>
  );
}
