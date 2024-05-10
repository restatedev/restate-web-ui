import { Form, useAsyncValue } from '@remix-run/react';
import { getEnvironmentLogs } from '@restate/data-access/cloud/api-client';
import { Button } from '@restate/ui/button';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';

export function LogsViewer() {
  const logs = useAsyncValue() as Awaited<
    ReturnType<typeof getEnvironmentLogs>
  >;

  if (logs.error) {
    return (
      <div className="font-sans">
        <ErrorBanner errors={[new Error(`Failed to load logs.`)]}>
          <Form method="GET">
            <Button
              type="submit"
              variant="secondary"
              className="flex items-center px-3 py-1"
            >
              <Icon name={IconName.Retry} className="w-[1.125em]" /> Retry
            </Button>
          </Form>
        </ErrorBanner>
      </div>
    );
  }

  return (
    <table className="">
      <tbody className="">
        {logs.data?.lines.map((line) => (
          <tr key={line.unixNanos} className="bg-transparent border-none">
            <th className="align-baseline font-normal text-gray-600">
              {new Date(
                Number(BigInt(line.unixNanos) / BigInt(1000000))
              ).toLocaleString('default', {
                timeZoneName: 'short',
              })}
            </th>
            <td className="pl-4 align-baseline pb-2">{line.line}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
