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
  raised = false,
}: {
  isPending?: boolean;
  className?: string;
  invocation?: Invocation;
  raised?: boolean;
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
      <div>
        <SectionTitle className="">
          {invocation.target_service_name}
        </SectionTitle>
        <SectionContent className="p-0" raised={raised}>
          <div className="flex px-1.5 py-1.5 items-center gap-1 h-9 border-b">
            <span className="pl-1 text-code text-gray-500 font-medium">
              Key
            </span>
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
          <div className="flex px-1.5 py-1.5 items-center gap-1 h-9">
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
                  {state.length > 0 ? (
                    `(${state.length})`
                  ) : (
                    <span className="text-gray-400">No state</span>
                  )}
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
      </div>
      {shouldShowQueue && (
        <div>
          <SectionTitle className="mt-2">queue</SectionTitle>
          <SectionContent raised={raised} className="pt-0 pb-0">
            <div className="flex flex-col min-h-[4.5rem] justify-center pt-8 pr-1">
              <div className="relative">
                <div className="absolute left-0 right-0 bottom-2  ">
                  <div className=" [clip-path:polygon(0%_0%,100%_50%,0%_50%)] bg-zinc-200 rounded-sm h-3" />
                  {((typeof position === 'number' && position > 0) ||
                    position === undefined) && (
                    <div className="top-1 absolute right-2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center">
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
                          <div>
                            <span className="font-mono">
                              {invocation?.target_service_name}
                            </span>{' '}
                            is locked by{' '}
                            <span className="font-mono">{head}</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}

                  {typeof position === 'number' && position >= 0 && (
                    <div
                      style={{
                        right: `clamp(${
                          position === 0 ? '0rem' : '2rem'
                        }, calc(${position * 2}rem) , calc(100% - 0.5rem))`,
                      }}
                      className="absolute -top-4 -translate-y-1/2 flex flex-col items-center"
                    >
                      <div className="w-[1.125rem] h-[1.125rem] mt-2 absolute top-1 ">
                        <HoverTooltip
                          content={
                            <div>
                              {position === 0 ? (
                                <div>
                                  The invocation holds the lock on
                                  <span className="font-mono">
                                    {' '}
                                    {invocation?.target_service_name}
                                  </span>
                                </div>
                              ) : (
                                `This invocation is ${formatOrdinals(
                                  position + 1
                                )}  in the queue`
                              )}
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
                </div>
              </div>
              <div className="text-xs text-zinc-500/80">
                {position === 0 && (
                  <>
                    Invocation is{' '}
                    <span className="font-medium text-zinc-500">in-flight</span>{' '}
                    while{' '}
                    {size - position - 1 === 0 ? (
                      'no'
                    ) : (
                      <span className="font-medium text-zinc-500">
                        {formatNumber(size - position - 1)}
                      </span>
                    )}{' '}
                    pending invocation(s) in queue.
                  </>
                )}
                {typeof position === 'number' && position > 0 && (
                  <>
                    Invocation is{' '}
                    <span className="font-medium text-zinc-500">pending</span>{' '}
                    until{' '}
                    <span className="font-medium text-zinc-500">
                      {formatNumber(position)}
                    </span>{' '}
                    prior invocation(s) in the queue have completed.
                  </>
                )}
              </div>
            </div>
          </SectionContent>
        </div>
      )}
    </Section>
  );
}
