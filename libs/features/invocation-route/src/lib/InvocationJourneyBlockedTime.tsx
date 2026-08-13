import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { MetricComparison } from '@restate/ui/metric-comparison';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import type { JourneyBlockedTime } from './InvocationJourneyModel';

const styles = tv({
  slots: {
    root: 'inline-flex min-w-0 items-baseline gap-1 whitespace-nowrap',
    phrase: 'font-normal text-gray-400',
    button:
      'inline-flex h-4 items-center gap-0.5 self-baseline rounded-md px-0.5 py-0 text-xs leading-4 shadow-none hover:bg-zinc-100 pressed:bg-zinc-100',
    chevrons: 'h-3 w-3 shrink-0 text-gray-400',
    popover: 'w-[min(24rem,calc(100vw-2rem))]',
    row: 'flex items-center justify-between gap-6 px-3 py-2 text-xs',
    gate: 'text-zinc-600 capitalize',
  },
});

export function JourneyBlockedTimeSummary({
  value,
  context = 'attempt',
}: {
  value: JourneyBlockedTime;
  context?: 'duration' | 'latest-attempt' | 'attempt';
}) {
  const { root, phrase, button, chevrons, popover, row, gate } = styles();
  const before =
    context === 'duration'
      ? 'after being blocked for'
      : context === 'latest-attempt'
        ? 'last attempt blocked for'
        : 'blocked for';
  const ariaLabel =
    context === 'latest-attempt'
      ? `Last attempt blocked time: ${value.duration}${value.ratio === undefined ? '' : `; ${value.ratio} times historical average`}`
      : `Blocked time: ${value.duration}${value.ratio === undefined ? '' : `; ${value.ratio} times historical average`}`;
  const title =
    context === 'latest-attempt' ? 'Last attempt blocked' : 'Blocked time';

  return (
    <span className={root()}>
      <span className={phrase()}>{before}</span>{' '}
      <Popover>
        <PopoverTrigger>
          <Button variant="icon" aria-label={ariaLabel} className={button()}>
            <span className="font-medium text-zinc-600 tabular-nums">
              {value.duration}
            </span>
            <Icon name={IconName.ChevronsUpDown} className={chevrons()} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={popover()}>
          <DropdownSection
            title={
              <span className="inline-flex items-baseline gap-1.5">
                <span>{title}</span>
                <span className="text-xs font-medium text-zinc-600 tabular-nums">
                  {value.duration}
                </span>
              </span>
            }
          >
            <div className="divide-y divide-gray-100">
              {value.breakdown.map((item) => (
                <div key={item.gate} className={row()}>
                  <span className={gate()}>{item.label}</span>
                  <MetricComparison
                    value={item.duration}
                    average={item.average}
                    ratio={item.ratio}
                    label={`${item.label} blocked time`}
                  />
                </div>
              ))}
            </div>
          </DropdownSection>
        </PopoverContent>
      </Popover>
      <MetricComparison
        value={value.duration}
        average={value.average}
        ratio={value.ratio}
        label={title}
        decorative
        showValue={false}
      />
    </span>
  );
}
