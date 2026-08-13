import { DateTooltip } from '@restate/ui/tooltip';
import type { JourneyNodeTiming } from './InvocationJourneyModel';

export function JourneyNodeTime({ timing }: { timing: JourneyNodeTiming }) {
  const content = (
    <span className="font-sans text-gray-400"> {timing.value}</span>
  );

  return timing.date && timing.tooltipTitle ? (
    <DateTooltip
      date={new Date(timing.date)}
      title={timing.tooltipTitle}
      className="no-underline"
    >
      {content}
    </DateTooltip>
  ) : (
    content
  );
}
