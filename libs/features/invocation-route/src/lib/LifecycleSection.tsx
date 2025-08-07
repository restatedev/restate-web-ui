import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Badge } from '@restate/ui/badge';
import { Status } from './Status';
import { Duration } from './StatusTimeline';

const styles = tv({ base: '' });

export function LifecycleSection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  if (!invocation) {
    return null;
  }
  return (
    <Section className={styles({ className })}>
      <SectionTitle>Lifecycle</SectionTitle>
      <SectionContent className="" raised={true}>
        <div className="relative flex flex-col">
          <div className="relative flex items-baseline pl-6">
            <div className="absolute top-3.25 bottom-0 left-[0.35rem] border-l" />
            <div className="absolute top-3.25 left-0 h-3 w-3 shrink-0 -translate-y-1/2 rounded-full border border-zinc-200 bg-zinc-100 shadow-xs" />
            <Badge className="border-transparent bg-transparent text-zinc-500">
              Created
            </Badge>
            <Duration
              date={invocation.created_at}
              suffix="ago"
              tooltipTitle="Created at"
            />
          </div>
          {invocation.status !== 'running' && invocation.running_at && (
            <div className="relative flex items-baseline pt-2 pl-6">
              <div className="absolute top-0 bottom-0 left-[0.35rem] border-l" />
              <div className="absolute top-5.25 left-0 h-3 w-3 shrink-0 -translate-y-1/2 rounded-full border border-zinc-200 bg-zinc-100 shadow-xs" />

              <Badge className="border-transparent bg-transparent text-zinc-500">
                Started to run
              </Badge>
              <Duration
                date={invocation.running_at}
                suffix="ago"
                tooltipTitle="The invocation first transitioned to running at"
              />
            </div>
          )}
          <div className="relative flex items-baseline pt-2 pl-6">
            <div className="absolute top-0 left-[0.35rem] h-5.25 border-l" />
            <div className="absolute top-5.25 left-0 h-3 w-3 shrink-0 -translate-y-1/2 rounded-full border border-zinc-200 bg-white p-0.5 shadow-xs">
              <div className="h-full w-full shrink-0 rounded-full bg-zinc-400" />
            </div>
            <Status invocation={invocation} />
          </div>
        </div>
      </SectionContent>
    </Section>
  );
}
