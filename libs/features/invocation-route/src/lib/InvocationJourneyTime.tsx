import { DateTooltip } from '@restate/ui/tooltip';
import type { JourneyNodeTiming } from './InvocationJourneyModel';

export function JourneyNodeTime({ timing }: { timing: JourneyNodeTiming }) {
  const content = (
    <span className="text-gray-400 tabular-nums"> {timing.value}</span>
  );

  return timing.date && timing.tooltipTitle ? (
    <DateTooltip date={new Date(timing.date)} title={timing.tooltipTitle}>
      {content}
    </DateTooltip>
  ) : (
    content
  );
}
