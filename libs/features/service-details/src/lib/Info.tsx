import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { formatPlurals } from '@restate/util/intl';

export function Info({
  info = [],
}: {
  info?: {
    code?: string | null;
    message: string;
  }[];
}) {
  if (info.length === 0) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          className="flex min-w-0 items-center gap-1 rounded-md border-orange-200 bg-orange-50 px-1 py-0.5 text-xs font-normal text-orange-600"
          variant="secondary"
        >
          <Icon
            name={IconName.TriangleAlert}
            className="h-3.5 w-3.5 shrink-0 text-orange-500"
          />
          <div className="min-w-0 truncate">
            {formatPlurals(info.length, {
              one: 'warning',
              other: 'warnings',
            })}
          </div>

          <div className="ml-1 flex-auto basis-5 truncate rounded-full bg-orange-500 px-1.5 text-2xs font-normal text-white">
            {info.length}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md">
        <DropdownSection
          title={formatPlurals(info.length, {
            one: 'warning',
            other: 'warnings',
          })}
        >
          {info?.map((infoItem) => (
            <p
              className="-m-px flex gap-2 border border-orange-200 bg-orange-50 p-3 text-0.5xs text-orange-600 first:rounded-t-xl last:rounded-b-xl"
              key={infoItem.code}
            >
              <Icon
                className="h-5 w-5 shrink-0 fill-orange-600 text-orange-100"
                name={IconName.TriangleAlert}
              />
              <span className="inline-block">
                <span className="font-semibold">Warning: </span>
                {infoItem.message}
              </span>
            </p>
          ))}
        </DropdownSection>
      </PopoverContent>
    </Popover>
  );
}
