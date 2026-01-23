import { Invocation } from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';
import { Badge } from '@restate/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { State } from './State';
import { Icon, IconName } from '@restate/ui/icons';
import {
  useGetVirtualObjectState,
  useGetVirtualObjectStateInterface,
} from '@restate/data-access/admin-api-hooks';
import { useState } from 'react';

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
  const [shouldFetchState, setShouldFetchState] = useState(false);
  const { data: stateData } = useGetVirtualObjectState(
    String(invocation?.target_service_name),
    String(invocation?.target_service_key),
    {
      enabled: shouldFetchState,
      staleTime: 0,
    },
  );

  const { data: stateInterface, isPending: stateIsPending } =
    useGetVirtualObjectStateInterface(
      String(invocation?.target_service_name),
      invocation?.target_service_key ? [invocation?.target_service_key] : [],
      {
        enabled: Boolean(
          typeof invocation?.target_service_key === 'string' &&
            invocation &&
            invocation.target_service_ty === 'workflow',
        ),
        staleTime: 0,
      },
    );

  if (invocation?.target_service_ty === 'workflow') {
    const state = stateData?.state ?? [];
    const keys = (stateData?.state || stateInterface?.keys) ?? [];

    return (
      <Section className={styles({ className })}>
        <SectionTitle>{invocation.target_service_name}</SectionTitle>
        <SectionContent className="p-0" raised={raised}>
          <div className="flex h-9 items-center px-1.5 py-1 not-last:border-b">
            <span className="flex-auto pl-1 text-0.5xs font-medium text-gray-500">
              Key
            </span>
            <Badge
              size="sm"
              className="ml-1 min-w-0 py-0 pr-0 align-middle font-mono"
            >
              <div className="truncate">{invocation?.target_service_key}</div>
              <Copy
                copyText={String(invocation?.target_service_key)}
                className="ml-1 shrink-0 p-1 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </Badge>
          </div>
          {invocation?.target_service_key !== undefined && (
            <div className="flex h-9 items-center gap-1 px-1.5 py-1">
              <span className="pl-1 text-0.5xs font-medium text-gray-500">
                State
              </span>
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="secondary"
                    onClick={() => setShouldFetchState(true)}
                    disabled={keys.length === 0 || stateIsPending}
                    className="ml-auto flex h-5 items-center gap-1 rounded-md border bg-white/70 px-1.5 py-0 font-mono text-xs font-medium text-zinc-600 disabled:border-transparent disabled:text-zinc-500 disabled:shadow-none"
                  >
                    {keys.length > 0 ? `(${keys.length})` : 'No state'}
                    {keys.length > 0 && (
                      <Icon
                        name={IconName.ChevronsUpDown}
                        className="h-3 w-3 shrink-0 text-gray-500"
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-lg">
                  <DropdownSection
                    title=""
                    className="mx-0 border-none bg-transparent px-0 font-mono [&&&]:mb-1"
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
