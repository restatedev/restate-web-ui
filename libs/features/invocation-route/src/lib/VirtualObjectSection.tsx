import type { Invocation } from '@restate/data-access/admin-api';
import {
  useGetVirtualObjectQueue,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api-hooks';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
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
          invocation.target_service_ty === 'virtual_object',
      ),
      staleTime: 0,
    },
  );
  const { data: stateData } = useGetVirtualObjectState(
    String(invocation?.target_service_name),
    String(invocation?.target_service_key),
    {
      enabled: Boolean(
        typeof invocation?.target_service_key === 'string' &&
          invocation &&
          invocation.target_service_ty === 'virtual_object',
      ),
      staleTime: 0,
    },
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
          <div className="flex h-9 items-center gap-1 border-b px-1.5 py-1.5">
            <span className="pl-1 text-0.5xs font-medium text-gray-500">
              Key
            </span>
            <Badge
              size="sm"
              className="ml-auto min-w-0 py-0 pr-0 align-middle font-mono"
            >
              <div className="truncate">{invocation?.target_service_key}</div>
              <Copy
                copyText={String(invocation?.target_service_key)}
                className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </Badge>
          </div>
          <div className="flex h-9 items-center gap-1 px-1.5 py-1.5">
            <span className="pl-1 text-0.5xs font-medium text-gray-500">
              State
            </span>
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="secondary"
                  disabled={state.length === 0}
                  className="ml-auto flex h-5 items-center gap-1 rounded-md border bg-white/70 px-1.5 py-0 font-mono text-xs font-medium text-zinc-600 disabled:border-transparent disabled:text-zinc-500 disabled:shadow-none"
                >
                  {state.length > 0 ? (
                    `(${state.length})`
                  ) : (
                    <span className="text-gray-400">No state</span>
                  )}
                  {(stateData?.state ?? [])?.length > 0 && (
                    <Icon
                      name={IconName.ChevronsUpDown}
                      className="h-3 w-3 shrink-0 text-gray-500"
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="max-w-lg">
                <DropdownSection
                  title=""
                  className="mx-0 border-none bg-transparent px-0 font-mono [&&&]:mb-1"
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
            <div className="flex min-h-18 flex-col justify-center pt-8 pr-1">
              <div className="relative">
                <div className="absolute right-0 bottom-2 left-0">
                  <div className="h-3 rounded-xs bg-zinc-200 [clip-path:polygon(0%_0%,100%_50%,0%_50%)]" />
                  {((typeof position === 'number' && position > 0) ||
                    position === undefined) && (
                    <div className="absolute top-1 right-2 flex translate-x-1/2 -translate-y-1/2 flex-col items-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Link
                            href={`?${INVOCATION_QUERY_NAME}=${head}`}
                            aria-label={head}
                            variant="secondary"
                            className="block h-6 w-6 rounded-lg border bg-white shadow-xs"
                          >
                            <Icon
                              name={IconName.Invocation}
                              className="h-full w-full animate-pulse p-1 text-zinc-500"
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
                      className="absolute -top-4 flex -translate-y-1/2 flex-col items-center"
                    >
                      <div className="absolute top-1 mt-2 h-4.5 w-4.5">
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
                                  position + 1,
                                )}  in the queue`
                              )}
                            </div>
                          }
                        >
                          <div className="inset-0 h-4.5 w-4.5 rounded-full bg-white p-1.5 shadow-xs">
                            <div className="h-full w-full rounded-full bg-blue-600" />
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
                    <span className="font-medium">In-flight</span> while{' '}
                    {size - position - 1 === 0 ? (
                      'no'
                    ) : (
                      <span className="font-medium text-orange-600">
                        {formatNumber(size - position - 1)}
                      </span>
                    )}{' '}
                    pending invocation(s) in queue.
                  </>
                )}
                {typeof position === 'number' && position > 0 && (
                  <>
                    <span className="font-medium text-orange-600">Pending</span>{' '}
                    until{' '}
                    <span className="font-medium text-orange-600">
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
