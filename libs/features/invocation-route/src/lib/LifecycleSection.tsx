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
        <div className="flex flex-col relative">
          <div className="flex items-baseline relative pl-6">
            <div className="absolute border-l left-[0.35rem] top-[0.8125rem]  bottom-0" />
            <div className="w-3 h-3 rounded-full shrink-0 bg-zinc-100 border border-zinc-200 shadow-sm absolute left-0 top-[0.8125rem] -translate-y-1/2" />
            <Badge className="border-transparent bg-transparent  text-zinc-500">
              Created
            </Badge>
            <Duration
              date={invocation.created_at}
              suffix="ago"
              tooltipTitle="Created at"
            />
          </div>
          {invocation.status !== 'running' && invocation.running_at && (
            <div className="flex items-baseline relative pl-6 pt-2">
              <div className="absolute border-l left-[0.35rem] top-0 bottom-0" />
              <div className="w-3 h-3 rounded-full shrink-0 bg-zinc-100 border border-zinc-200 shadow-sm absolute left-0 top-[1.3125rem] -translate-y-1/2" />

              <Badge className="border-transparent bg-transparent  text-zinc-500">
                Started to run
              </Badge>
              <Duration
                date={invocation.running_at}
                suffix="ago"
                tooltipTitle="The invocation first transitioned to running at"
              />
            </div>
          )}
          <div className="flex items-baseline relative pl-6 pt-2">
            <div className="absolute border-l left-[0.35rem] top-0 h-[1.3125rem] " />
            <div className="w-3 h-3 rounded-full shrink-0 bg-white border border-zinc-200 shadow-sm absolute left-0 top-[1.3125rem] -translate-y-1/2 p-0.5">
              <div className="w-full h-full rounded-full shrink-0 bg-zinc-400" />
            </div>
            <Status invocation={invocation} />
          </div>
        </div>
      </SectionContent>
    </Section>
  );
}
