import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { predefinedQueries } from './predefinedQueries';

export function UsefulQueries({
  onSelect,
}: {
  onSelect: (query: string) => void;
}) {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center gap-1.5 pl-1 text-xs font-medium text-gray-500">
        <Icon name={IconName.HatGlasses} className="h-3.5 w-3.5" />
        Useful queries
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {predefinedQueries.map((query) => {
          return (
            <Button
              key={query.id}
              variant="secondary"
              onClick={() => onSelect(query.query)}
              className="flex flex-col items-start gap-1 border-transparent bg-black/3 px-4 py-3 text-left shadow-none hover:bg-black/6 pressed:bg-black/10"
            >
              <span className="flex w-full min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {query.title}
                </span>
              </span>
              <span className="text-xs text-gray-500">{query.description}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
