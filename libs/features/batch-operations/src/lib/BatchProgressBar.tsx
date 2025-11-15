import { formatPercentage } from '@restate/util/intl';
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
}: {
  successful: number;
  failed: number;
  total: number | undefined;
  isPending: boolean;
}) {
  const processed = successful + failed;
  const successRatio = total && total > 0 ? successful / total : 0;
  const failedRatio = total && total > 0 ? failed / total : 0;
  const processedRatio = total && total > 0 ? processed / total : 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex translate-y-4 flex-col">
        <span className="text-lg font-normal text-gray-600">
          {successful + failed || <br />}{' '}
          {!!failed && (
            <span className="text-sm text-gray-500">({failed} failed)</span>
          )}
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
            {processed > 0 && isPending && (
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
            {isPending && (
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
