import { useGetInvocation } from '@restate/data-access/admin-api-hooks';
import { Target } from './Target';
import { Copy } from '@restate/ui/copy';
import { Status } from './Status';

export function InvocationPopoverContent({ id }: { id: string }) {
  const { data: invocation } = useGetInvocation(id, {
    refetchOnMount: 'always',
  });
  return (
    <div className="flex max-w-2xl flex-col items-start gap-1.5 px-3 py-2.5">
      {invocation && (
        <Target target={invocation.target} className="max-w-full flex-none" />
      )}
      <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-xs text-zinc-600">{id}</span>
          <Copy
            copyText={id}
            className="h-5 w-5 shrink-0 rounded-md border bg-white p-1 text-gray-700 shadow-xs"
          />
        </div>
        {invocation && <Status invocation={invocation} />}
      </div>
    </div>
  );
}
