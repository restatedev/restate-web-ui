import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  TruncateWithTooltip,
  TruncateTooltipTrigger,
} from '@restate/ui/tooltip';
import { PropsWithChildren, useRef } from 'react';
import { tv } from '@restate/util/styles';
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
  base: 'relative inline-flex max-w-full min-w-10 flex-auto rounded-(--rounded-radius) bg-white pl-2 text-xs font-medium text-zinc-600 shadow-xs ring-1 ring-gray-200 transition-all [--rounded-radius-right:0.5rem] [--rounded-radius:0.5rem] ring-inset *:flex-auto *:basis-0 [&:has([data-pressed=true])]:shadow-none',
  variants: {
    withChildren: {
      true: '[&>*:first-child]:max-w-fit [&>*:first-child]:basis-auto',
      false: '',
    },
  },
});
export function Target({
  target = '',
  className,
  showHandler = true,
  children,
}: PropsWithChildren<{
  target?: string;
  className?: string;
  showHandler?: boolean;
}>) {
  const results = target?.split('/');
  const linkRef = useRef<HTMLAnchorElement>(null);

  if (results.length < 1) {
    return null;
  }

  const service = results.at(0);
  const handler = results.at(-1);
  const key =
    target && service && handler && results.length > 2
      ? target.substring(
          Number(service?.length) + 1,
          target.length - Number(handler?.length) - 1,
        )
      : undefined;
  const shouldShowHandler = showHandler && typeof handler === 'string';

  return (
    <div className={styles({ className, withChildren: Boolean(children) })}>
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
        <div
          className="flex shrink-0 items-stretch overflow-hidden *:flex-auto"
          data-target
        >
          <div className="mr-2.5 inline-flex max-w-full items-center truncate [&&]:grow-0 [&:has(a)]:mr-0">
            <Icon
              name={IconName.Box}
              className="mr-1 h-3 w-3 shrink-0 fill-zinc-100 text-zinc-400"
            />
            <TruncateTooltipTrigger>{service}</TruncateTooltipTrigger>
            {!shouldShowHandler && (typeof key === 'undefined' || children) && (
              <div className="my-px mr-1 flex shrink-0 items-center rounded-r-[calc(var(--rounded-radius)-1px)] pr-0.5 pl-[2px]">
                <Link
                  ref={linkRef}
                  href={`?${SERVICE_QUERY_PARAM}=${service}`}
                  aria-label={target}
                  variant="secondary"
                  className="my-1 flex items-center rounded-full outline-offset-0 before:absolute before:inset-0 before:z-2 before:rounded-(--rounded-radius) before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="aspect-square w-[1.25em] shrink-0 text-gray-500"
                  />
                </Link>
              </div>
            )}
          </div>

          {typeof key === 'string' && (
            <>
              <div className="my-px -ml-1 max-w-fit min-w-2 truncate filter-[drop-shadow(-1px_0px_0px_var(--color-zinc-200))] [&&]:shrink-1 [&&]:grow-10000 [&&]:basis-0">
                <div className="flex h-full items-center bg-zinc-50 pr-2 pl-1.5 font-mono text-[90%] text-zinc-500 [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0%_100%)]">
                  <TruncateTooltipTrigger>
                    {key || <>&nbsp;</>}
                  </TruncateTooltipTrigger>
                </div>
              </div>
              {!shouldShowHandler && !children && (
                <div className="my-px mr-px ml-[-4px] flex truncate rounded-r-[calc(var(--rounded-radius)-1px)] bg-zinc-50 pr-0.5 pl-[2px] [&&]:shrink-0">
                  <Link
                    ref={linkRef}
                    href={`?${SERVICE_QUERY_PARAM}=${service}`}
                    aria-label={target}
                    variant="secondary"
                    className="my-1 flex items-center rounded-full outline-offset-0 before:absolute before:inset-0 before:z-2 before:rounded-(--rounded-radius) before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
                  >
                    <Icon
                      name={IconName.ChevronRight}
                      className="aspect-square w-[1.25em] shrink-0 text-gray-500"
                    />
                  </Link>
                </div>
              )}
            </>
          )}
          {shouldShowHandler && (
            <>
              <div className="my-px ml-[-4px] truncate filter-[drop-shadow(-1px_0px_0px_var(--color-zinc-200))]">
                <div className="flex h-full items-center bg-zinc-100 pr-0.5 pl-1 font-medium text-zinc-600/80 italic [clip-path:polygon(4px_0,100%_0,100%_100%,0%_100%)]">
                  <Icon
                    name={IconName.Function}
                    className="-mr-0.5 h-4 w-4 shrink-0 text-zinc-400"
                  />
                  <TruncateTooltipTrigger>{handler}</TruncateTooltipTrigger>
                </div>
              </div>
              <div className="my-px mr-px ml-auto flex h-full shrink-0 justify-end rounded-r-[calc(var(--rounded-radius-right)-1px)] bg-zinc-100 pr-0.5 pl-[2px] [&&]:grow-0">
                <Link
                  ref={linkRef}
                  href={`?${SERVICE_QUERY_PARAM}=${service}`}
                  aria-label={target}
                  variant="secondary"
                  className="my-1 flex items-center rounded-full outline-offset-0 before:absolute before:inset-0 before:z-2 before:rounded-(--rounded-radius) before:rounded-r-(--rounded-radius-right) before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="h-4 w-4 shrink-0 text-gray-500"
                  />
                </Link>
                &nbsp;
              </div>
            </>
          )}
        </div>
      </TruncateWithTooltip>
      {children && (
        <div className="z-3 mt-px ml-[-4px] max-w-full -translate-x-px truncate filter-[drop-shadow(-1px_0px_0px_var(--color-zinc-200))] [&:has([data-fill])]:shrink-0 [&:has([data-fill])]:basis-auto">
          <div className="flex h-full items-center rounded-r-[calc(var(--rounded-radius-right)-1px)] bg-zinc-100 pr-0.5 pl-1.5 font-medium text-zinc-600/80 italic [clip-path:polygon(4px_0,100%_0,100%_100%,0%_100%)]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
