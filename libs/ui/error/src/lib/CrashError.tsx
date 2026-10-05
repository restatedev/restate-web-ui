import { isRouteErrorResponse, useRouteError } from 'react-router';
import { isUnauthorizedError } from '@restate/util/errors';
import { Link } from '@restate/ui/link';
import { Button } from '@restate/ui/button';
import { Copy } from '@restate/ui/copy';
import { EmptyState } from '@restate/ui/empty-state';
import { IconName } from '@restate/ui/icons';

interface CrashErrorProps {
  supportHref?: string;
}

export function CrashError({
  supportHref = 'https://github.com/restatedev/restate/issues/new',
}: CrashErrorProps) {
  const error = useRouteError();
  console.error(error);

  if (error instanceof Error && isUnauthorizedError(error)) {
    return null;
  }

  const details =
    error instanceof Error
      ? (error.stack ?? error.message)
      : isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : String(error);

  return (
    <EmptyState
      icon={IconName.TriangleAlert}
      intent="warning"
      title="This page couldn’t be displayed"
      description="Something went wrong in the UI while showing this page. Your Restate services and invocations are not affected and keep running."
      contentClassName="max-w-lg"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link variant="secondary-button" href="/">
          Go to home
        </Link>
      </div>
      <details className="w-full text-left">
        <summary className="mx-auto w-fit cursor-pointer rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
          Error details
        </summary>
        <div className="relative mt-2">
          <pre className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white p-3 pr-10 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-gray-600 shadow-xs">
            {details}
          </pre>
          <Copy copyText={details} className="absolute top-1.5 right-1.5" />
        </div>
      </details>
      <p className="text-xs text-gray-500">
        If this keeps happening,{' '}
        <Link variant="secondary" href={supportHref}>
          let us know
        </Link>{' '}
        and include the error details.
      </p>
    </EmptyState>
  );
}
