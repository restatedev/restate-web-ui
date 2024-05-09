import { useAsyncValue } from '@remix-run/react';
import { getEnvironmentLogs } from '@restate/data-access/cloud/api-client';

export function LogsViewer() {
  const logs = useAsyncValue() as Awaited<
    ReturnType<typeof getEnvironmentLogs>
  >;
  return (
    <div className="overflow-auto relative flex-auto text-xs font-mono mt-4 whitespace-pre-wrap rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <div className="absolute inset-4">
        <table className="">
          <tbody className="">
            {logs.data?.lines.map((line) => (
              <tr key={line.unixNanos} className="bg-transparent border-none">
                <th className="align-baseline font-normal text-gray-600">
                  {new Date(Number(line.unixNanos) / 1000).toLocaleString(
                    'default',
                    {
                      timeZoneName: 'short',
                    }
                  )}
                </th>
                <td className="pl-4 align-baseline pb-2">{line.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="h-4" />
      </div>
    </div>
  );
}
