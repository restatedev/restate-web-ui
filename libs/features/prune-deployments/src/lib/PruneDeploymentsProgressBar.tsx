import { Deployment } from '@restate/features-deployment';
import { deploymentHref } from '@restate/util-panel';
import { useRestateContext } from '@restate/features-restate-context';
import { Button } from '@restate/ui-button';
import {
  DropdownItem,
  DropdownMenu,
  DropdownSection,
} from '@restate/ui-dropdown';
import { ErrorBanner } from '@restate/ui-error';
import { Spinner } from '@restate/ui-loading';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { HoverTooltip } from '@restate/ui-tooltip';
import {
  formatNumber,
  formatPercentageWithoutFraction,
} from '@restate/util-intl';
import { tv } from '@restate/util-styles';

const progressBarStyles = tv({
  base: 'peer h-3 transform rounded-l-md rounded-r-xs border shadow-[inset_0_1px_0_0_--theme(--box-shadow-color-highlight/20%)] drop-shadow-xs transition peer-[*]:rounded-l-xs last:rounded-r-md',
  variants: {
    variant: {
      success:
        'border-tint bg-linear-to-b from-accent-vivid/90 to-accent-vivid',
      error:
        'border-tint bg-linear-to-b from-warning-vivid/90 to-warning-vivid',
    },
    isZero: {
      true: 'hidden',
      false: '',
    },
  },
});

const remainderStyles = tv({
  base: 'flex-auto rounded-r-md bg-emphasis shadow-[inset_0_1px_0px_0px_--theme(--box-shadow-color-default/3%)] transition',
  variants: {
    isZero: {
      true: 'rounded-l-md',
      false: 'rounded-l-xs',
    },
  },
});

const markerStyles = tv({
  base: 'flex -translate-y-0.5 items-center gap-1 text-0.5xs text-muted',
  variants: {
    moreThanHalf: {
      true: 'translate-x-[-1.5ch] flex-row-reverse',
      false: 'translate-x-[1ch]',
    },
  },
});

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
  const { baseUrl } = useRestateContext();
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
        <span className="inline-flex transform items-baseline gap-1 text-lg font-normal text-tertiary transition-all">
          <span className="transform text-accent transition-all">
            {formatNumber(successful)}{' '}
            <span className="text-0.5xs text-muted">deleted</span>
          </span>
          {!!failed && (
            <Popover>
              <PopoverTrigger>
                <span className="inline-flex -translate-y-0.5 transform items-baseline text-0.5xs text-muted transition-all">
                  <div className="mx-1 h-4 w-px translate-y-1 bg-neutral" />
                  <Button
                    variant="icon"
                    className="py-0 underline decoration-dashed decoration-from-font underline-offset-4 outline-offset-0"
                  >
                    <span className="text-0.5xs text-muted">
                      <span className="text-sm text-warning">
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
                        href={deploymentHref(baseUrl, {
                          deployment: deploymentId,
                        })}
                      >
                        <div className="flex flex-col gap-0 text-0.5xs">
                          <Deployment
                            deploymentId={deploymentId}
                            showLink={false}
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
                              className="-mt-1 overflow-auto bg-transparent pl-3 group-focus:**:text-on-danger [&_output]:max-h-fit [&_output]:whitespace-normal [&_svg]:mt-1 [&_svg]:h-3.5 [&_svg]:w-3.5"
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
          <div className="ml-auto flex items-center gap-1 text-0.5xs text-muted">
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
              <div className="h-5 w-1.5 -translate-y-1 rounded-sm border border-surface bg-accent-vivid" />
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
