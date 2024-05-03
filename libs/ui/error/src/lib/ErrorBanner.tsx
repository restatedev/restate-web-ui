import { Icon, IconName } from '@restate/ui/icons';

export interface ErrorProps {
  errors?: Error[];
}

function SingleError({ error }: { error?: Error }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-xl bg-red-100 p-3">
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          <Icon
            className="h-5 w-5 fill-red-500 text-red-500"
            name={IconName.CircleX}
          />
        </div>
        <output className="text-sm text-red-700">{error.message}</output>
      </div>
    </div>
  );
}

export function ErrorBanner({ errors = [] }: ErrorProps) {
  if (errors.length === 0) {
    return null;
  }
  if (errors.length === 1) {
    const [error] = errors;
    return <SingleError error={error} />;
  }

  return (
    <div className="rounded-xl bg-red-100 p-3">
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
                <li key={error.message}>{error.message}</li>
              ))}
            </ul>
          </output>
        </div>
      </div>
    </div>
  );
}
