import type {
  Handler,
  Service,
  components,
} from '@restate/data-access/admin-api-spec';
import { cx, tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { panelHref } from '@restate/util/panel';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { IssueBadge } from '@restate/ui/issue-banner';
import { toServiceAndHandlerInvocationsHref } from '@restate/util/invocation-links';
import {
  InvocationCountLink,
  HandlerBreakdownTooltip,
  MiniService,
} from '@restate/features/service';
import {
  buildStatusEntries,
  ServiceStatusBar,
} from '@restate/features/status-chart';
import { HandlerInputOutput } from '@restate/feature/handler-input-output';
import { getRangeLabel } from '@restate/features/restate-context';
import type { ServiceIssue } from '@restate/features/system-health';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import {
  cardContainerStyles,
  cardInnerStyles,
  type IssueSeverity,
} from './cardShell';

const layoutStyles = tv({
  base: cx(
    'grid grid-cols-[auto_minmax(0,1fr)_13rem] items-center gap-x-3 gap-y-3',
    "[grid-template-areas:'icon_primary_primary'_'._service_chart']",
    '@6xl:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_13rem]',
    "@6xl:[grid-template-areas:'icon_primary_service_chart']",
    '@min-[100rem]:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_13rem]',
    "@min-[100rem]:[grid-template-areas:'icon_primary_service_chart']",
  ),
});

const iconCellStyles = tv({
  base: '[grid-area:icon]',
});

const primaryCellStyles = tv({
  base: 'flex min-w-0 items-center gap-2 [grid-area:primary]',
});

const serviceCellStyles = tv({
  base: 'flex min-w-0 items-center [grid-area:service]',
});

const chartCellStyles = tv({
  base: 'flex min-w-0 items-center gap-3 [grid-area:chart]',
});

export function HandlerCard({
  service,
  handler,
  baseUrl,
  handlerIssues,
  summaryData,
  isSummaryError,
  isSummaryLoading,
  handlerCount,
  linkParams,
  isFocusVisible,
  issueSeverity,
}: {
  service: Service;
  handler: Handler;
  baseUrl: string;
  handlerIssues: ServiceIssue[];
  summaryData?: components['schemas']['InvocationsSummaryResponse'];
  isSummaryError: boolean;
  isSummaryLoading: boolean;
  handlerCount: number;
  linkParams?: URLSearchParams;
  isFocusVisible?: boolean;
  issueSeverity?: IssueSeverity;
}) {
  const rows = (summaryData?.byServiceAndHandlerAndStatus ?? []).filter(
    (s) => s.service === service.name && s.handler === handler.name,
  );
  const statuses = buildStatusEntries(rows);
  const total = statuses.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="mb-1.5 px-2 pt-0.5">
      <div
        className={cardContainerStyles({ isFocusVisible })}
        {...waveAnimationProps('overview-card')}
      >
        <div className={cardInnerStyles({ issueSeverity })}>
          <div className={layoutStyles()}>
            <div className={iconCellStyles()}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-white shadow-xs">
                <Icon
                  name={IconName.Function}
                  className="h-full w-full fill-blue-50 p-0.5 text-blue-400 drop-shadow-md"
                />
              </div>
            </div>
            <div className={primaryCellStyles()}>
              <div className="flex min-w-0 items-center text-base leading-7 font-medium text-zinc-700 italic">
                <TruncateWithTooltip copyText={handler.name}>
                  {handler.name}
                </TruncateWithTooltip>
                <span className="shrink-0 text-zinc-400">{'('}</span>
                <HandlerInputOutput
                  jsonSchema={handler.input_json_schema}
                  contentType={handler.input_description}
                  label="Request"
                  className="text-0.5xs [&_button]:text-zinc-500/80"
                />
                <span className="shrink-0 text-zinc-400">
                  {')'}
                  <span className="mx-[0.5ch] text-zinc-500">→</span>
                </span>
                <HandlerInputOutput
                  jsonSchema={handler.output_json_schema}
                  contentType={handler.output_description}
                  label="Response"
                  className="text-0.5xs [&_button]:text-zinc-500/80"
                />
              </div>

              <HoverTooltip content="Playground">
                <Link
                  href={panelHref({
                    playground: service.name,
                    handler: handler.name,
                  })}
                  variant="secondary-button"
                  className="relative shrink-0 px-1 py-1 align-middle"
                >
                  <Icon
                    name={IconName.Play}
                    className="ml-px h-3 w-3 text-blue-700"
                  />
                </Link>
              </HoverTooltip>
              {handlerIssues.length > 0 && (
                <IssueBadge
                  issues={handlerIssues}
                  serviceName={service.name}
                  baseUrl={baseUrl}
                />
              )}
            </div>

            <div className={serviceCellStyles()}>
              <MiniService service={service} />
            </div>

            <div className={chartCellStyles()}>
              <div className="min-w-0 flex-1">
                <ServiceStatusBar
                  serviceName={service.name}
                  handlerName={handler.name}
                  data={summaryData}
                  isLoading={isSummaryLoading}
                  linkParams={linkParams}
                />
              </div>
              <InvocationCountLink
                href={toServiceAndHandlerInvocationsHref(
                  baseUrl,
                  service.name,
                  handler.name,
                  { existingParams: linkParams },
                )}
                count={handlerCount}
                isLoading={isSummaryLoading}
                isError={isSummaryError}
                size="sm"
                variant="minimal"
                breakdownTooltip={
                  total > 0 ? (
                    <HandlerBreakdownTooltip
                      serviceName={service.name}
                      handlerName={handler.name}
                      statuses={statuses}
                      total={total}
                      rangeLabel={getRangeLabel(summaryData?.range)}
                      linkParams={linkParams}
                    />
                  ) : undefined
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
