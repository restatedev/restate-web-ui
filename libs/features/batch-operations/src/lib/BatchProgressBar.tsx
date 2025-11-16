import { Button } from '@restate/ui/button';
import {
  DropdownItem,
  DropdownMenu,
  DropdownSection,
} from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { formatPercentage } from '@restate/util/intl';
import { tv } from '@restate/util/styles';
import { PropsWithChildren } from 'react';
export const MAX_FAILED_INVOCATIONS = 100;

const progressBarStyles = tv({
  base: 'peer h-3 transform rounded-l-md rounded-r-xs border shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] drop-shadow-xs transition peer-[*]:rounded-l-xs last:rounded-r-md',
  variants: {
    variant: {
      success: 'border-black/10 bg-linear-to-b from-blue-400/90 to-blue-400',
      error: 'border-black/10 bg-linear-to-b from-orange-400/90 to-orange-400',
    },
    isZero: {
      true: 'hidden',
      false: '',
    },
  },
});

const remainderStyles = tv({
  base: 'flex-auto rounded-r-md bg-gray-200 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] transition',
  variants: {
    isZero: {
      true: 'rounded-l-md',
      false: 'rounded-l-xs',
    },
  },
});

const markerStyles = tv({
  base: '-translate-y-0.5 text-0.5xs text-gray-500',
  variants: {
    moreThanHalf: {
      true: 'translate-x-[-1.5ch]',
      false: 'translate-x-[1ch]',
    },
  },
});

export function BatchProgressBar({
  successful,
  failed,
  total,
  isPending,
  failedInvocations,
  children,
  isCompleted,
}: PropsWithChildren<{
  successful: number;
  failed: number;
  total: number | undefined;
  isPending: boolean;
  isCompleted: boolean;
  failedInvocations?: { invocationId: string; error: string }[];
}>) {
  const processed = successful + failed;
  const successRatio = total && total > 0 ? successful / total : 0;
  const failedRatio = total && total > 0 ? failed / total : 0;
  const processedRatio = total && total > 0 ? processed / total : 0;
  if (successful === 0 && failed === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex translate-y-4 flex-col">
        <span className="inline-flex transform items-baseline gap-1 text-lg font-normal text-gray-600 transition-all">
          {successful ? (
            <span className="transform text-blue-600 transition-all">
              {successful}{' '}
              <span className="text-0.5xs text-gray-500">succeeded</span>{' '}
            </span>
          ) : (
            <br />
          )}{' '}
          {!!failed && (
            <Popover>
              <PopoverTrigger>
                <span className="inline-flex -translate-y-0.5 transform items-baseline text-0.5xs text-gray-500 transition-all">
                  <div className="mx-1 h-4 w-px translate-y-1 bg-gray-400" />
                  <Button
                    variant="icon"
                    className="py-0 underline decoration-dashed decoration-from-font underline-offset-4 outline-offset-0"
                  >
                    <span className="text-0.5xs text-gray-500">
                      <span className="text-sm text-orange-600">{failed}</span>{' '}
                      failed
                    </span>
                  </Button>
                </span>
                <PopoverContent>
                  <DropdownSection
                    title={`Failed invocations ${(failedInvocations?.length || 0) === MAX_FAILED_INVOCATIONS ? `(last ${MAX_FAILED_INVOCATIONS})` : ''}`}
                  >
                    <DropdownMenu>
                      {failedInvocations?.map(({ invocationId, error }) => (
                        <DropdownItem
                          key={invocationId}
                          href={`/invocations/${invocationId}`}
                        >
                          <div className="flex flex-col gap-0 text-0.5xs">
                            <div className="flex flex-row items-center gap-1 font-mono">
                              <Icon
                                name={IconName.Invocation}
                                className="h-4 w-4 rounded-sm border-none bg-transparent [&>svg]:p-px"
                              />
                              <span className="text-gray-500 group-focus:text-gray-200">
                                {invocationId}
                              </span>
                              <Icon
                                name={IconName.ChevronRight}
                                className="ml-auto h-3.5 w-3.5"
                              />
                            </div>
                            <ErrorBanner
                              error={new Error(error)}
                              className="-mt-1 bg-transparent pl-0 group-focus:**:text-red-50 [&_svg]:mt-1 [&_svg]:h-3.5 [&_svg]:w-3.5"
                            />
                          </div>
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </DropdownSection>
                </PopoverContent>
              </PopoverTrigger>
            </Popover>
          )}
          <div className="ml-auto" />
          {isPending && <Spinner className="mr-0.5 h-4 w-4" />}
          <div>{children}</div>
        </span>
      </div>

      {/* Progress bar */}
      {total !== undefined && total > 0 && (
        <div className="flex flex-col gap-3.5">
          <div className="relative mt-1 flex h-3 w-full gap-0.5">
            {/* Success portion */}
            <div
              className={progressBarStyles({
                variant: 'success',
                isZero: successful === 0,
              })}
              style={{
                width: `${successRatio * 100}%`,
              }}
            />
            {/* Failed portion */}
            {failed > 0 && (
              <div
                className={progressBarStyles({
                  variant: 'error',
                  isZero: false,
                })}
                style={{
                  width: `${failedRatio * 100}%`,
                }}
              />
            )}
            {/* Progress marker */}
            {processed > 0 && !isCompleted && (
              <div className="relative">
                <div className="h-5 w-1.5 -translate-y-1 rounded-sm border border-white bg-blue-400" />
                <div className="absolute top-4 flex translate-x-[calc(-50%+0.375rem)]">
                  <div
                    className={markerStyles({
                      moreThanHalf: successful + failed > 0.5 * total,
                    })}
                  >
                    {formatPercentage(processedRatio)}
                  </div>
                </div>
              </div>
            )}
            {/* Remainder */}
            {!isCompleted && (
              <div
                className={remainderStyles({
                  isZero: successful + failed === 0,
                })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
