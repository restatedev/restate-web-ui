import { useRouteError } from 'react-router';
import { isUnauthorizedError } from '@restate/util/errors';
import { Link } from '@restate/ui/link';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
} from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { Copy } from '@restate/ui/copy';
import { ErrorBanner } from './ErrorBanner';

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

  const errorWithStack = new Error(
    [(error as Error)?.message, (error as Error)?.stack]
      .filter(Boolean)
      .join('\n\n'),
  );
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Oops something went{' '}
        <Popover>
          <PopoverHoverTrigger>
            <Button
              variant="icon"
              className="mx-[-0.1em] inline-block h-full rounded-sm px-[0.1em] [font-size:inherit] text-red-700 [font-style:inherit] underline decoration-red-300 decoration-dashed decoration-from-font underline-offset-[0.2em] hover:bg-red-100 pressed:bg-red-100"
            >
              wrong!
            </Button>
          </PopoverHoverTrigger>
          <PopoverContent className="max-w-2xl">
            <ErrorBanner
              error={errorWithStack}
              className="pr-16 font-mono whitespace-pre [&_output]:max-h-64"
            />
            <Copy
              copyText={String(errorWithStack)}
              className="absolute top-1 right-2"
            />
          </PopoverContent>
        </Popover>
      </h1>
      <p className="mt-6 text-base leading-7 text-gray-500">
        Sorry, we couldn’t load what you’re looking for.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link variant="button" href="/">
          Go back home
        </Link>
        <a href={supportHref} className="text-sm font-semibold text-gray-500">
          Contact support <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
  );
}
