import { Invocation } from '@restate/data-access/admin-api-spec';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';

const styles = tv({ base: '' });
export function KeysIdsSection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  const idempotencyId = invocation?.idempotency_key;
  const traceId = invocation?.trace_id;
  const restateVersion = invocation?.created_using_restate_version;

  if (!invocation) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>Invocation Metadata</SectionTitle>
      <SectionContent className="p-0">
        <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
          <span className="flex-auto pl-1 text-0.5xs font-medium whitespace-nowrap text-gray-500">
            Invocation Id
          </span>
          <Badge
            size="sm"
            className="ml-10 min-w-0 py-0 pr-0 align-middle font-mono"
          >
            <div className="truncate">{invocation.id}</div>
            <Copy
              copyText={invocation?.id}
              className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
            />
          </Badge>
        </div>

        {restateVersion && !restateVersion.startsWith('0.0.0') && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto shrink-0 pl-1 text-0.5xs font-medium text-gray-500">
              Create by Restate
            </span>
            <Badge
              size="sm"
              className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono"
            >
              <div className="truncate">{restateVersion}</div>

              <Copy
                copyText={restateVersion}
                className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </Badge>
          </div>
        )}
        {idempotencyId && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Idempotency Key
            </span>
            <Badge
              size="sm"
              className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono"
            >
              <div className="truncate">{idempotencyId}</div>

              <Copy
                copyText={idempotencyId}
                className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </Badge>
          </div>
        )}

        {traceId && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Trace ID
            </span>
            <Badge
              size="sm"
              className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono"
            >
              <div className="truncate">{traceId}</div>
              <Copy
                copyText={traceId}
                className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </Badge>
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
