import type { Service } from '@restate/data-access/admin-api-spec';
import {
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
} from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { usePopover } from '@restate/ui/popover';
import { Handler } from './Handler';
import { HANDLER_QUERY_PARAM, SERVICE_QUERY_PARAM } from './constants';

export function HandlerGridList({
  serviceName,
  handlers,
  serviceType,
}: {
  serviceName: string;
  handlers: Service['handlers'];
  serviceType: Service['ty'];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { close } = usePopover();

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
            const params = new URLSearchParams(searchParams);
            params.set(SERVICE_QUERY_PARAM, serviceName);
            params.set(HANDLER_QUERY_PARAM, handler.name);
            setSearchParams(params);
          }}
          className="cursor-default rounded-md px-3 py-2 text-sm outline-none select-none data-[focused]:bg-blue-600 data-[focused]:text-white [&[data-focused]_*:not(svg)]:!text-inherit"
        >
          <Handler
            handler={handler}
            service={serviceName}
            serviceType={serviceType}
            showLink={false}
            showType={false}
            className="w-fit pr-0 pl-0"
          />
        </AriaGridListItem>
      ))}
    </AriaGridList>
  );
}
