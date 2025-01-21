import { Icon, IconName } from '@restate/ui/icons';
import { RestateError } from '@restate/util/errors';
import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import { RestateServerError } from './RestateServerError';

export interface ErrorProps {
  errors?: (Error | null)[] | (string | null)[] | (RestateError | null)[];
  error?: Error | string | RestateError | null;
  className?: string;
  wrap?: boolean;
}

const styles = tv({
  base: 'rounded-xl bg-red-100 p-3 text-sm',
});

function SingleError({
  error,
  children,
  className,
  wrap,
}: PropsWithChildren<{
  error?:
    | Error
    | null
    | string
    | {
        message: string;
        restate_code?: string | null;
      };
  className?: string;
  wrap?: boolean;
}>) {
  if (!error) {
    return null;
  }

  if (error instanceof RestateError) {
    return (
      <RestateServerError error={error} className={className} wrap={wrap} />
    );
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
        <output className="flex-auto text-red-700 [word-break:break-word] max-h-28 overflow-auto">
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
  wrap,
}: PropsWithChildren<ErrorProps>) {
  const filteredErrors = errors.filter(Boolean);
  if (filteredErrors.length === 0 && !error) {
    return null;
  }
  if (filteredErrors.length === 1) {
    const [singleError] = filteredErrors;
    return (
      <SingleError
        error={singleError}
        children={children}
        className={className}
        wrap={wrap}
      />
    );
  }

  if (error) {
    return (
      <SingleError
        error={error}
        children={children}
        className={className}
        wrap={wrap}
      />
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
          <h3 className="font-medium text-red-800">
            There were {filteredErrors.length} errors:
          </h3>
          <output className=" text-red-700 [word-break:break-word] max-h-20 overflow-auto">
            <ul className="list-disc space-y-1 pl-5">
              {filteredErrors.map((error) => (
                <li key={typeof error === 'string' ? error : error?.message}>
                  {typeof error === 'string' ? error : error?.message}
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
