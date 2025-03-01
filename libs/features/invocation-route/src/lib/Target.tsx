import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  TruncateWithTooltip,
  TruncateTooltipTrigger,
} from '@restate/ui/tooltip';
import { useRef } from 'react';
import { tv } from 'tailwind-variants';
import { SERVICE_QUERY_PARAM } from '@restate/features/overview-route';

function TargetTooltipContent({
  service,
  handler,
  serviceKey,
}: {
  service?: string;
  handler?: string;
  serviceKey?: string;
}) {
  return (
    <div className="[word-break:break-word]">
      {service}
      {typeof serviceKey === 'string' && (
        <>
          {' / '}
          <wbr />
          {serviceKey}
        </>
      )}
      {' / '}
      <wbr />
      {handler}
    </div>
  );
}
const styles = tv({
  base: 'min-w-0 max-w-full [&:has([data-pressed=true])]:shadow-none transition-all inline-flex relative shadow-sm pl-2 text-xs rounded-lg bg-white ring-gray-200 text-zinc-600 font-medium ring-1 ring-inset',
});
export function Target({
  target = '',
  className,
  showHandler = true,
}: {
  target?: string;
  className?: string;
  showHandler?: boolean;
}) {
  const results = target?.split('/');
  const linkRef = useRef<HTMLAnchorElement>(null);

  if (results.length < 1) {
    return null;
  }

  const service = results.at(0);
  const handler = results.at(-1);
  const key = results.length === 3 ? results.at(1) : undefined;
  const shouldShowHandler = showHandler && typeof handler === 'string';

  return (
    <div className={styles({ className })}>
      <TruncateWithTooltip
        tooltipContent={
          <TargetTooltipContent
            service={service}
            handler={handler}
            serviceKey={key}
          />
        }
        copyText={target}
        triggerRef={linkRef}
      >
        <div className="flex items-stretch overflow-hidden">
          <div className="truncate inline-flex items-center [&:has(a)]:mr-0 mr-2.5">
            <Icon
              name={IconName.Box}
              className="w-3 h-3 mr-1 text-zinc-400 fill-zinc-100 shrink-0"
            />
            <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
            {!shouldShowHandler && typeof key === 'undefined' && (
              <div className="shrink-0 items-center h-full flex my-[1px] mr-px pl-[2px] rounded-r-[calc(0.5rem-1px)] pr-0.5">
                <Link
                  ref={linkRef}
                  href={`?${SERVICE_QUERY_PARAM}=${service}`}
                  aria-label={target}
                  variant="secondary"
                  className="outline-offset-0 my-1 rounded-full before:rounded-lg before:absolute before:inset-0 before:z-[2] before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5"
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="w-4 h-4 text-gray-500 shrink-0 "
                  />
                </Link>
              </div>
            )}
          </div>

          {typeof key === 'string' && (
            <>
              <div className="basis-0 grow shrink-1 max-w-fit truncate my-px [filter:drop-shadow(-1px_0px_0px_theme(colors.zinc.200/100%))] -ml-1">
                <div className="font-mono [font-size:90%] h-full [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0%_100%)] bg-zinc-50 text-zinc-500 flex items-center pl-1.5 pr-2">
                  <TruncateTooltipTrigger>{key}</TruncateTooltipTrigger>
                </div>
              </div>
              {!shouldShowHandler && (
                <div className="truncate ml-[-4px] shrink-0 bg-zinc-50 h-full flex my-[1px] mr-px pl-[2px] rounded-r-[calc(0.5rem-1px)] pr-0.5">
                  <Link
                    ref={linkRef}
                    href={`?${SERVICE_QUERY_PARAM}=${service}`}
                    aria-label={target}
                    variant="secondary"
                    className="outline-offset-0 my-1 rounded-full before:rounded-lg before:absolute before:inset-0 before:z-[2] before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5"
                  >
                    <Icon
                      name={IconName.ChevronRight}
                      className="w-4 h-4 text-gray-500 shrink-0 "
                    />
                  </Link>
                </div>
              )}
            </>
          )}
          {shouldShowHandler && (
            <>
              <div className="truncate my-px [filter:drop-shadow(-1px_0px_0px_theme(colors.zinc.200/100%))] ml-[-4px]">
                <div className="italic font-medium h-full [clip-path:polygon(4px_0,100%_0,100%_100%,0%_100%)] bg-zinc-100 text-zinc-600/80 flex items-center pl-1 pr-0.5">
                  <Icon
                    name={IconName.Function}
                    className="w-4 h-4 text-zinc-400 shrink-0 -mr-0.5"
                  />
                  <TruncateTooltipTrigger>{handler}</TruncateTooltipTrigger>
                </div>
              </div>
              <div className="shrink-0 bg-zinc-100 h-full flex my-[1px] mr-px pl-[2px] rounded-r-[calc(0.5rem-1px)] pr-0.5">
                <Link
                  ref={linkRef}
                  href={`?${SERVICE_QUERY_PARAM}=${service}`}
                  aria-label={target}
                  variant="secondary"
                  className="outline-offset-0 my-1 rounded-full before:rounded-lg before:absolute before:inset-0 before:z-[2] before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5"
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="w-4 h-4 text-gray-500 shrink-0 "
                  />
                </Link>
              </div>
            </>
          )}
        </div>
      </TruncateWithTooltip>
    </div>
  );
}
