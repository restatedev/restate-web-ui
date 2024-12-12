import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { INVOCATION_QUERY_NAME } from './constants';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';
import {
  HoverTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@restate/ui/tooltip';
import { formatNumber, formatOrdinals } from '@restate/util/intl';

const styles = tv({ base: '' });
export function VirtualObjectSection({
  size,
  head,
  position,
  isPending,
  className,
  invocation,
}: {
  size?: number;
  head?: string;
  position?: number;
  isPending?: boolean;
  className?: string;
  invocation?: Invocation;
}) {
  if (
    typeof position === 'undefined' ||
    typeof size === 'undefined' ||
    typeof head === 'undefined' ||
    typeof invocation?.target_service_key === 'undefined' ||
    invocation?.target_service_ty !== 'virtual_object'
  ) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>Virtual Object</SectionTitle>
      <SectionContent className="p-0">
        <div className="flex px-1.5 py-1 items-center">
          <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
            Key
          </span>
          <Badge
            size="sm"
            className="font-mono py-0 pr-0 align-middle ml-1 min-w-0"
          >
            <div className="truncate">{invocation?.target_service_key}</div>
            <Copy
              copyText={String(invocation?.target_service_key)}
              className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
            />
          </Badge>
        </div>
      </SectionContent>
      <SectionTitle className="mt-2">queue</SectionTitle>
      <SectionContent raised={false}>
        <div>
          <div className="relative mt-12">
            <div className="absolute left-0 right-0 bottom-2  ">
              <div className=" [clip-path:polygon(0%_0%,100%_50%,0%_50%)] bg-zinc-200 rounded-sm h-3" />
              {position > 0 && (
                <div className="-top-1 absolute right-2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center">
                  <span className="text-xs font-medium text-zinc-400 font-mono">
                    Head
                  </span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Link
                        href={`?${INVOCATION_QUERY_NAME}=${head}`}
                        aria-label={head}
                        variant="secondary"
                        className="w-6 h-6 bg-white shadow-sm border rounded-lg block"
                      >
                        <Icon
                          name={IconName.Invocation}
                          className="w-full h-full text-zinc-500 p-1 animate-pulse"
                        />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent small>
                      The ongoing invocation at the head
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {position >= 0 && (
                <div
                  style={{
                    right: `clamp(${position === 0 ? '0rem' : '2rem'}, ${
                      (position * 100) / (size - 1)
                    }% , calc(100% - 0.5rem))`,
                  }}
                  className="absolute -top-4 -translate-y-1/2 flex flex-col items-center"
                >
                  <div className="text-xs font-medium text-zinc-500 font-mono h-3.5">
                    {position === 0 ? 'Head' : ' '}
                  </div>
                  <div className="w-[1.125rem] h-[1.125rem] mt-2 absolute top-2.5 ">
                    <HoverTooltip
                      content={
                        <div>
                          {position === 0
                            ? 'Head'
                            : `${formatOrdinals(position + 1)}  in the queue`}
                        </div>
                      }
                    >
                      <div className="inset-0 shadow-sm w-[1.125rem] h-[1.125rem] bg-white rounded-full p-1.5">
                        <div className="bg-blue-600 rounded-full h-full w-full" />
                      </div>
                    </HoverTooltip>
                  </div>
                </div>
              )}
              {position !== size - 1 && (
                <div className="absolute left-0 -top-4 -translate-y-1/2 flex flex-col items-center">
                  <div className="text-xs font-medium text-zinc-400 font-mono">
                    {formatNumber(size - 1)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-zinc-500/80">
            {position === 0 && (
              <>
                Invocation is in progress with{' '}
                <span className="font-medium text-zinc-500">
                  {formatNumber(size - position - 1)}
                </span>{' '}
                pending in queue.
              </>
            )}
            {position > 0 && (
              <>
                Invocation is pending waiting for{' '}
                <span className="font-medium text-zinc-500">
                  {formatNumber(position)}
                </span>{' '}
                ahead in the queue.
              </>
            )}
          </div>
        </div>
      </SectionContent>
    </Section>
  );
}
