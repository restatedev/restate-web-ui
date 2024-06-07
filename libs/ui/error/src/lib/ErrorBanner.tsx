import { Icon, IconName } from '@restate/ui/icons';
import { PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';

export interface ErrorProps {
  errors?: Error[] | string[];
  className?: string;
}

const styles = tv({
  base: 'rounded-xl bg-red-100 p-3',
});

function SingleError({
  error,
  children,
  className,
}: PropsWithChildren<{ error?: Error | string; className?: string }>) {
  if (!error) {
    return null;
  }

  return (
    <div className={styles({ className })}>
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          <Icon
            className="h-5 w-5 fill-red-500 text-red-500"
            name={IconName.CircleX}
          />
        </div>
        <output className="text-sm flex-auto text-red-700">
          {typeof error === 'string' ? error : error.message}
        </output>
        {children && <div className="flex-shrink-0">{children}</div>}
      </div>
    </div>
  );
}

export function ErrorBanner({
  errors = [],
  children,
  className,
}: PropsWithChildren<ErrorProps>) {
  if (errors.length === 0) {
    return null;
  }
  if (errors.length === 1) {
    const [error] = errors;
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
          <output className="text-sm text-red-700">
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
