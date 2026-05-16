import type { Service } from '@restate/data-access/admin-api-spec';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import {
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownSection,
} from '@restate/ui/dropdown';
import { formatPlurals } from '@restate/util/intl';
import { useRestateContext } from '@restate/features/restate-context';
import { toServiceAndHandlerInvocationsHref } from '@restate/util/invocation-links';
import { Link } from '@restate/ui/link';
import { HoverTooltip } from '@restate/ui/tooltip';
import { panelHref } from '@restate/util/panel';
import { Handler } from './Handler';
import { HandlerGridList } from './HandlerGridList';
import { InvocationCountLink } from './InvocationCountLink';

export function HandlerList({
  serviceName,
  handlers,
  serviceType,
  maxVisible = 6,
  className,
  handlerCounts,
  isHandlerCountsLoading,
  isHandlerCountsError,
  linkParams,
}: {
  serviceName: string;
  handlers: Service['handlers'];
  serviceType: Service['ty'];
  maxVisible?: number;
  className?: string;
  handlerCounts?: Map<string, number>;
  isHandlerCountsLoading?: boolean;
  isHandlerCountsError?: boolean;
  linkParams?: URLSearchParams;
}) {
  const { baseUrl } = useRestateContext();

  if (handlers.length === 0) return null;

  const visible = handlers.slice(0, maxVisible);
  const overflowCount = handlers.length - maxVisible;

  return (
    <div className={className}>
      {visible.map((handler) => (
        <div key={handler.name} className="flex items-center">
          <Handler
            handler={handler}
            className="ml-1.5 max-w-fit min-w-0 pr-0 pl-0 [&_[data-icon]]:-mr-2.5 [&_[data-icon]]:border-transparent [&_[data-icon]]:bg-transparent [&_[data-icon]]:shadow-none [&_[data-icon]>svg]:text-zinc-500/80 [&_a>svg]:hidden"
            service={serviceName}
            serviceType={serviceType}
            showLink
            showType={false}
          />
          <div className="flex shrink-0 gap-1">
            <HoverTooltip content="Playground">
              <Link
                href={panelHref({
                  playground: serviceName,
                  handler: handler.name,
                })}
                variant="icon"
                className="h-6 w-6 shrink-0 rounded-full p-0 text-gray-500 hover:bg-blue-500/10 hover:text-blue-600"
                aria-label={`Open ${handler.name} in playground`}
              >
                <Icon
                  name={IconName.Play}
                  className="ml-px h-2.5 w-2.5 fill-current"
                />
              </Link>
            </HoverTooltip>
            <InvocationCountLink
              href={toServiceAndHandlerInvocationsHref(
                baseUrl,
                serviceName,
                handler.name,
                { existingParams: linkParams },
              )}
              count={handlerCounts?.get(handler.name) ?? 0}
              isLoading={isHandlerCountsLoading}
              isError={isHandlerCountsError}
              size="sm"
              variant="minimal"
            />
          </div>
        </div>
      ))}
      {overflowCount > 0 && (
        <div className="ml-8 w-fit">
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="icon"
                className="-ml-2.5 h-auto w-auto gap-0.5 rounded-lg px-1.5 py-0.5 text-0.5xs text-zinc-500 hover:bg-black/3 hover:text-zinc-700"
              >
                +{overflowCount}{' '}
                {formatPlurals(overflowCount, {
                  one: 'handler',
                  other: 'handlers',
                })}
                <Icon
                  name={IconName.ChevronsUpDown}
                  className="h-4 w-4 text-gray-400"
                />
              </Button>
            </DropdownTrigger>
            <DropdownPopover placement="bottom start">
              <DropdownSection title="Handlers">
                <HandlerGridList
                  serviceName={serviceName}
                  handlers={handlers}
                  serviceType={serviceType}
                />
              </DropdownSection>
            </DropdownPopover>
          </Dropdown>
        </div>
      )}
    </div>
  );
}
