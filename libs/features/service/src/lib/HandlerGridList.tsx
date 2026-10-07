import type { Service } from '@restate/data-access/admin-api-spec';
import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
} from 'react-aria-components';
import { usePopover } from '@restate/ui/popover';
import { serviceHref } from '@restate/util/panel';
import { useRestateContext } from '@restate/features/restate-context';
import { useNavigate } from 'react-router';
import { Handler } from './Handler';

export function HandlerGridList({
  serviceName,
  handlers,
  serviceType,
}: {
  serviceName: string;
  handlers: Service['handlers'];
  serviceType: Service['ty'];
}) {
  const { close } = usePopover();
  const navigate = useNavigate();
  const { baseUrl } = useRestateContext();

  return (
    <AriaGridList
      aria-label={`All handlers for ${serviceName}`}
      autoFocus="first"
      className="flex flex-col gap-1 p-1 outline-none"
    >
      {handlers.map((handler) => (
        <AriaGridListItem
          key={handler.name}
          id={handler.name}
          textValue={handler.name}
          onHoverStart={(e) => {
            (e.target as HTMLElement).focus();
          }}
          onAction={() => {
            close?.();
            navigate(
              serviceHref(baseUrl, {
                service: serviceName,
                handler: handler.name,
              }),
            );
          }}
          className="cursor-default rounded-md px-3 py-2 text-sm outline-none select-none data-[focused]:bg-blue-600 data-[focused]:text-white [&[data-focused]_*:not(svg)]:!text-inherit"
        >
          <Handler
            handler={handler}
            service={serviceName}
            serviceType={serviceType}
            showLink={false}
            showType={false}
            className="w-fit pr-0 pl-0 [&_[data-icon]]:h-6 [&_[data-icon]]:w-6"
          />
        </AriaGridListItem>
      ))}
    </AriaGridList>
  );
}
