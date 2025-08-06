import {
  Invocation,
  useGetVirtualObjectState,
} from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from 'tailwind-variants';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { State } from './State';
import { Icon, IconName } from '@restate/ui/icons';

const styles = tv({ base: '' });
export function WorkflowKeySection({
  invocation,
  isPending,
  className,
  raised = true,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
  raised?: boolean;
}) {
  const { data: stateData } = useGetVirtualObjectState(
    String(invocation?.target_service_name),
    String(invocation?.target_service_key),
    {
      enabled: Boolean(
        typeof invocation?.target_service_key === 'string' &&
          invocation &&
          invocation.target_service_ty === 'workflow'
      ),
      staleTime: 0,
    }
  );

  if (invocation?.target_service_ty === 'workflow') {
    const state = stateData?.state ?? [];

    return (
      <Section className={styles({ className })}>
        <SectionTitle>{invocation.target_service_name}</SectionTitle>
        <SectionContent className="p-0" raised={raised}>
          <div className="flex px-1.5 py-1 items-center not-last:border-b h-9">
            <span className="flex-auto pl-1 text-code text-gray-500 font-medium">
              Key
            </span>
            <Badge
              size="sm"
              className="font-mono py-0 pr-0 align-middle ml-1 min-w-0"
            >
              <div className="truncate">{invocation?.target_service_key}</div>
              <Copy
                copyText={String(invocation?.target_service_key)}
                className="shrink-0 [&_svg]:w-2.5 [&_svg]:h-2.5 p-1 ml-1"
              />
            </Badge>
          </div>
          {invocation?.target_service_key !== undefined && (
            <div className="flex px-1.5 py-1 items-center gap-1 h-9">
              <span className="pl-1 text-code text-gray-500 font-medium">
                State
              </span>
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="secondary"
                    disabled={state.length === 0}
                    className="bg-white/70 border disabled:border-transparent disabled:shadow-none disabled:text-zinc-500 px-1.5 text-zinc-600 font-mono font-medium py-0 flex rounded-md items-center gap-1 text-xs h-5 ml-auto"
                  >
                    {state.length > 0 ? `(${state.length})` : 'No state'}
                    {(stateData?.state ?? [])?.length > 0 && (
                      <Icon
                        name={IconName.ChevronsUpDown}
                        className="h-3 w-3 text-gray-500 shrink-0"
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-lg">
                  <DropdownSection
                    title=""
                    className="px-0 bg-transparent border-none mx-0 [&&&]:mb-1 font-mono"
                  >
                    <State
                      state={stateData?.state}
                      service={invocation?.target_service_name}
                      serviceKey={invocation?.target_service_key}
                    />
                  </DropdownSection>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </SectionContent>
      </Section>
    );
  }
  return null;
}
