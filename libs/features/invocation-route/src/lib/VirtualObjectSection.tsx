import {
  Invocation,
  useGetVirtualObjectQueue,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api';
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
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { State } from './State';

const styles = tv({ base: '' });
export function VirtualObjectSection({
  isPending,
  className,
  invocation,
}: {
  isPending?: boolean;
  className?: string;
  invocation?: Invocation;
}) {
  const { data } = useGetVirtualObjectQueue(
    String(invocation?.target_service_name),
    String(invocation?.target_service_key),
    String(invocation?.id),
    {
      enabled: Boolean(
        typeof invocation?.target_service_key === 'string' &&
          invocation &&
          !invocation.completed_at &&
          invocation.target_service_ty === 'virtual_object'
      ),
      staleTime: 0,
    }
  );
  const { data: stateData } = useGetVirtualObjectState(
    String(invocation?.target_service_name),
    String(invocation?.target_service_key),
    {
      enabled: Boolean(
        typeof invocation?.target_service_key === 'string' &&
          invocation &&
          invocation.target_service_ty === 'virtual_object'
      ),
      staleTime: 0,
    }
  );

  if (
    !data ||
    typeof invocation?.target_service_key === 'undefined' ||
    invocation?.target_service_ty !== 'virtual_object'
  ) {
    return null;
  }
  const { size, head } = data;
  const position = data[invocation.id];

  const shouldShowQueue = typeof size === 'number' && typeof head === 'string';
  const state = stateData?.state ?? [];
  return (
    <Section className={styles({ className })}>
      <SectionTitle className="">{invocation.target_service_name}</SectionTitle>
      <SectionContent className="p-0 rounded-b-none">
        <div className="flex px-1.5 py-1 items-center gap-1">
          <span className="pl-1 text-code text-gray-500 font-medium">Key</span>
          <Badge
            size="sm"
            className="font-mono py-0 pr-0 align-middle min-w-0 ml-auto"
          >
            <div className="truncate">{invocation?.target_service_key}</div>
            <Copy
              copyText={String(invocation?.target_service_key)}
              className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
            />
          </Badge>
        </div>
      </SectionContent>
      <SectionContent className="rounded-t-none -mt-px p-0">
        <div className="flex px-1.5 py-1 items-center gap-1">
          <span className="pl-1 text-code text-gray-500 font-medium">
            State
          </span>
          <Popover>
            <PopoverTrigger>
              <Button
                variant="secondary"
                disabled={state.length === 0}
                className="bg-white/70 border disabled:border-transparent disabled:shadow-none disabled:text-zinc-500 px-1.5 text-zinc-600 font-mono font-medium py-0 flex rounded-md items-center gap-1 text-xs h-5 ml-auto"
              >
                {state.length > 0 ? `(${state.length})` : 'No state'}
                {(stateData?.state ?? [])?.length > 0 && (
                  <Icon
                    name={IconName.ChevronsUpDown}
                    className="h-3 w-3 text-gray-500 shrink-0"
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-lg">
              <DropdownSection
                title=""
                className="px-0 bg-transparent border-none mx-0 [&&&]:mb-1 font-mono"
              >
                <State
                  state={stateData?.state}
                  service={invocation?.target_service_name}
                  serviceKey={invocation?.target_service_key}
                />
              </DropdownSection>
            </PopoverContent>
          </Popover>
        </div>
      </SectionContent>
      {shouldShowQueue && (
        <>
          <SectionTitle className="mt-2">queue</SectionTitle>
          <SectionContent raised={false}>
            <div>
              <div className="relative mt-12">
                <div className="absolute left-0 right-0 bottom-2  ">
                  <div className=" [clip-path:polygon(0%_0%,100%_50%,0%_50%)] bg-zinc-200 rounded-sm h-3" />
                  {((typeof position === 'number' && position > 0) ||
                    position === undefined) && (
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
                        <TooltipContent size="sm">
                          The ongoing invocation at the head
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  {typeof position === 'number' && position >= 0 && (
                    <div
                      style={{
                        right: `clamp(${position === 0 ? '0rem' : '2rem'}, ${
                          (position * 100) / Math.max(size - 1, 1)
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
                                : `${formatOrdinals(
                                    position + 1
                                  )}  in the queue`}
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
                        {formatNumber(size)}
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
                {typeof position === 'number' && position > 0 && (
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
        </>
      )}
    </Section>
  );
}
