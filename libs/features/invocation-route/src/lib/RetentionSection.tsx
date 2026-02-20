import { Invocation } from '@restate/data-access/admin-api-spec';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { Retention } from './Retention';

const styles = tv({ base: '' });
export function RetentionSection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  if (!invocation?.completion_retention && !invocation?.journal_retention) {
    return null;
  }

  return (
    <Section className={styles({ className })}>
      <SectionTitle>Invocation Retention</SectionTitle>
      <SectionContent className="p-0">
        {invocation?.completion_retention && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium whitespace-nowrap text-gray-500">
              <Retention
                invocation={invocation}
                type="completion"
                prefixForCompletion="Completion retention "
                prefixForInProgress="Completion retained "
                className="text-0.5xs [&_*]:font-medium [&_*]:text-gray-500 [&_.value]:text-zinc-600"
              />
            </span>
          </div>
        )}
        {invocation?.journal_retention && (
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium whitespace-nowrap text-gray-500">
              <Retention
                invocation={invocation}
                type="journal"
                prefixForCompletion="Journal retention "
                prefixForInProgress="Journal retained "
                className="text-0.5xs [&_*]:font-medium [&_*]:text-gray-500 [&_.value]:text-zinc-600"
              />
            </span>
          </div>
        )}
      </SectionContent>
    </Section>
  );
}
