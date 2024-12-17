import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';

const styles = tv({ base: '' });
export function WorkflowKeySection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  if (invocation?.target_service_ty === 'workflow') {
    return (
      <Section className={styles({ className })}>
        <SectionTitle>{invocation.target_service_name}</SectionTitle>
        <SectionContent className="p-0">
          <div className="flex px-1.5 py-1 items-center">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Key
            </span>
            <Badge
              size="sm"
              className="font-mono py-0 pr-0 align-middle ml-1 min-w-0"
            >
              <div className="truncate">
                {JSON.stringify(invocation?.target_service_key)}
              </div>
              <Copy
                copyText={String(invocation?.target_service_key)}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
              />
            </Badge>
          </div>
        </SectionContent>
      </Section>
    );
  }
  return null;
}
