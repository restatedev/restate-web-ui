import {
  Deployment,
  DEPLOYMENT_QUERY_PARAM,
} from '@restate/features/deployment';
import { Button } from '@restate/ui/button';
import {
  DropdownItem,
  DropdownMenu,
  DropdownSection,
} from '@restate/ui/dropdown';
import { ErrorBanner } from '@restate/ui/error';
import { Spinner } from '@restate/ui/loading';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { HoverTooltip } from '@restate/ui/tooltip';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util/intl';
import { tv } from '@restate/util/styles';

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
  base: 'flex -translate-y-0.5 items-center gap-1 text-0.5xs text-gray-500',
  variants: {
    moreThanHalf: {
      true: 'translate-x-[-1.5ch] flex-row-reverse',
      false: 'translate-x-[1ch]',
    },
  },
});

function truncateError(error: string) {
  return error.length > 250 ? `${error.slice(0, 250)}…` : error;
}

export function PruneDeploymentsProgressBar({
  successful,
  failed,
  total,
  isPending,
  failedDeployments = [],
}: {
  successful: number;
  failed: number;
  total: number;
  isPending: boolean;
  failedDeployments?: { deploymentId: string; error: string }[];
}) {
  const processed = successful + failed;
  const successRatio = total > 0 ? successful / total : 0;
  const failedRatio = total > 0 ? failed / total : 0;
  const processedRatio = total > 0 ? processed / total : 0;
  const isCompleted = processed === total;

  if (total === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex translate-y-4 flex-col">
        <span className="inline-flex transform items-baseline gap-1 text-lg font-normal text-gray-600 transition-all">
          <span className="transform text-blue-600 transition-all">
            {formatNumber(successful)}{' '}
            <span className="text-0.5xs text-gray-500">deleted</span>
          </span>
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
                      <span className="text-sm text-orange-600">
                        {formatNumber(failed)}
                      </span>{' '}
                      failed
                    </span>
                  </Button>
                </span>
              </PopoverTrigger>
              <PopoverContent className="max-w-lg">
                <DropdownSection title="Failed deployments">
                  <DropdownMenu>
                    {failedDeployments.map(({ deploymentId, error }) => (
                      <DropdownItem
                        key={deploymentId}
                        className=""
                        href={`?${DEPLOYMENT_QUERY_PARAM}=${deploymentId}`}
                      >
                        <div className="flex flex-col gap-0 text-0.5xs">
                          <Deployment
                            deploymentId={deploymentId}
                            showLink={false}
                            highlightSelection={false}
                            className="[&_*:not(svg)]:text-inherit"
                          />

                          <HoverTooltip content={error} className="max-w-lg">
                            <ErrorBanner
                              error={
                                new Error(
                                  error.slice(0, 250) +
                                    (error.length > 250 ? '…' : ''),
                                )
                              }
                              className="-mt-1 overflow-auto bg-transparent pl-3 group-focus:**:text-red-50 [&_output]:max-h-fit [&_output]:whitespace-normal [&_svg]:mt-1 [&_svg]:h-3.5 [&_svg]:w-3.5"
                            />
                          </HoverTooltip>
                        </div>
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </DropdownSection>
              </PopoverContent>
            </Popover>
          )}
          <div className="ml-auto flex items-center gap-1 text-0.5xs text-gray-500">
            {isPending && <Spinner className="h-3 w-3" />}
            <span>
              {formatNumber(processed)} / {formatNumber(total)}
            </span>
          </div>
        </span>
      </div>
      <div className="flex flex-col gap-3.5">
        <div className="relative mt-1 flex h-3 flex-auto gap-0.5">
          {successful > 0 && (
            <div
              className={progressBarStyles({
                variant: 'success',
                isZero: successful === 0,
              })}
              style={{ width: `${successRatio * 100}%` }}
            />
          )}
          {failed > 0 && (
            <div
              className={progressBarStyles({
                variant: 'error',
                isZero: failed === 0,
              })}
              style={{ width: `${failedRatio * 100}%` }}
            />
          )}
          {processed > 0 && !isCompleted && (
            <div className="relative">
              <div className="h-5 w-1.5 -translate-y-1 rounded-sm border border-white bg-blue-400" />
              <div className="absolute top-4 flex translate-x-[calc(-50%-0.375rem)]">
                <div
                  className={markerStyles({
                    moreThanHalf: processed > 0.5 * total,
                  })}
                >
                  <div className="text-left">
                    {formatPercentageWithoutFraction(processedRatio)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {!isCompleted && (
            <div
              className={remainderStyles({
                isZero: successful + failed === 0,
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
