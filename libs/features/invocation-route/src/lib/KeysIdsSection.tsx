import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Copy } from '@restate/ui/copy';

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
  if (!idempotencyId && !traceId) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>Keys & IDs</SectionTitle>
      <SectionContent
        className="p-0"
        data-className="font-mono py-0.5 flex items-center pr-0.5 text-zinc-600 text-code"
      >
        {idempotencyId && (
          <div className="flex [&:not(:last-child)]:border-b px-1.5 py-1">
            <div className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Idempotency Key
            </div>
            <div className="h-5 min-w-5 self-end  bg-zinc-50 text-zinc-600 ring-zinc-600/20 inline-flex text-xs gap-1 items-center rounded-md pl-2 py-0.5 font-medium ring-1 ring-inset">
              {idempotencyId}
              <Copy
                copyText={idempotencyId}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1"
              />
            </div>
          </div>
        )}
        {traceId && (
          <div className="flex px-1.5 py-1">
            <div className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Trace ID
            </div>
            <div className="h-5 min-w-5 self-end  bg-zinc-50 text-zinc-600 ring-zinc-600/20 inline-flex text-xs gap-1 items-center rounded-md pl-2 py-0.5 font-medium ring-1 ring-inset">
              {traceId}
              <Copy
                copyText={traceId}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1"
              />
            </div>
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
