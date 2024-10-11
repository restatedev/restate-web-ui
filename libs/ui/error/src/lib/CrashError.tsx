import { useRouteError } from '@remix-run/react';
import { UnauthorizedError } from '@restate/util/errors';
import { Link } from '@restate/ui/link';

export function CrashError() {
  const error = useRouteError();
  console.error(error);

  if (error instanceof UnauthorizedError) {
    return null;
  }

  return (
    <div className="text-center">
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Oops something went wrong!
      </h1>
      <p className="mt-6 text-base leading-7 text-gray-500">
        Sorry, we couldn’t load what you’re looking for.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link variant="button" href="/">
          Go back home
        </Link>
        <a href="#" className="text-sm font-semibold text-gray-500">
          Contact support <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
  );
}
