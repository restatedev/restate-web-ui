import { Icon, IconName } from '@restate/ui/icons';
import { RestateError } from '@restate/util/errors';
import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import { RestateServerError } from './RestateServerError';

export interface ErrorProps {
  errors?: Error[] | string[] | RestateError[];
  error?: Error | string | RestateError;
  className?: string;
}

const styles = tv({
  base: 'rounded-xl bg-red-100 p-3',
});

function SingleError({
  error,
  children,
  className,
}: PropsWithChildren<{
  error?:
    | Error
    | string
    | {
        message: string;
        restate_code?: string | null;
      };
  className?: string;
}>) {
  if (!error) {
    return null;
  }

  if (error instanceof RestateError) {
    return <RestateServerError error={error} />;
  }

  return (
    <div className={styles({ className })}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">
          <Icon
            className="h-5 w-5 fill-red-500 text-red-500"
            name={IconName.CircleX}
          />
        </div>
        <output className="text-sm flex-auto text-red-700 [word-break:break-word] max-h-28 overflow-auto">
          {typeof error === 'string' ? error : error.message}
        </output>
        {children && <div className="flex-shrink-0">{children}</div>}
      </div>
    </div>
  );
}

export function ErrorBanner({
  errors = [],
  error,
  children,
  className,
}: PropsWithChildren<ErrorProps>) {
  if (errors.length === 0 && !error) {
    return null;
  }
  if (errors.length === 1) {
    const [singleError] = errors;
    return (
      <SingleError
        error={singleError}
        children={children}
        className={className}
      />
    );
  }

  if (error) {
    return (
      <SingleError error={error} children={children} className={className} />
    );
  }

  return (
    <div className={styles({ className })}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon
            className="h-5 w-5 fill-red-500 text-red-500"
            name={IconName.CircleX}
          />
        </div>
        <div className="ml-3 flex flex-col gap-2">
          <h3 className="text-sm font-medium text-red-800">
            There were {errors.length} errors:
          </h3>
          <output className="text-sm text-red-700 [word-break:break-word] max-h-20 overflow-auto">
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((error) => (
                <li key={typeof error === 'string' ? error : error.message}>
                  {typeof error === 'string' ? error : error.message}
                </li>
              ))}
            </ul>
          </output>
          {children}
        </div>
      </div>
    </div>
  );
}
