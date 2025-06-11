import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
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
      <SectionTitle>Metadata</SectionTitle>
      <SectionContent className="p-0">
        <div className="flex px-1.5 py-1 h-9 items-center [&:not(:last-child)]:border-b">
          <span className="flex-auto pl-1 text-code text-gray-500 font-medium whitespace-nowrap">
            Invocation Id
          </span>
          <Badge
            size="sm"
            className="font-mono py-0 pr-0 align-middle min-w-0 ml-10"
          >
            <div className="truncate">{invocation.id}</div>
            <Copy
              copyText={invocation?.id}
              className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
            />
          </Badge>
        </div>

        {restateVersion && restateVersion.startsWith('0.0.0') && (
          <div className="flex px-1.5 py-1 h-9 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium shrink-0">
              Create by Restate
            </span>
            <Badge
              size="sm"
              className="font-mono py-0 pr-0 align-middle ml-1 min-w-0"
            >
              <div className="truncate">{restateVersion}</div>

              <Copy
                copyText={restateVersion}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
              />
            </Badge>
          </div>
        )}
        {idempotencyId && (
          <div className="flex px-1.5 py-1 h-9 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Idempotency Key
            </span>
            <Badge
              size="sm"
              className="font-mono py-0 pr-0 align-middle ml-1 min-w-0"
            >
              <div className="truncate">{idempotencyId}</div>

              <Copy
                copyText={idempotencyId}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
              />
            </Badge>
          </div>
        )}

        {traceId && (
          <div className="flex px-1.5 py-1 h-9 items-center [&:not(:last-child)]:border-b">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Trace ID
            </span>
            <Badge
              size="sm"
              className="font-mono py-0 pr-0 align-middle ml-1 min-w-0"
            >
              <div className="truncate">{traceId}</div>
              <Copy
                copyText={traceId}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
              />
            </Badge>
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
