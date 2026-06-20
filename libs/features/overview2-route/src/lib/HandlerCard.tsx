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
} from '@restate/features/service';
import { Revision } from '@restate/features/deployment';
import {
  buildStatusEntries,
  ServiceStatusBar,
} from '@restate/features/status-chart';
import { HandlerInputOutput } from '@restate/feature/handler-input-output';
import { getRangeLabel } from '@restate/features/restate-context';
import { useIsFeatureFlagEnabled } from '@restate/util/feature-flag';
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
    "[grid-template-areas:'icon_primary_primary'_'chart_chart_chart']",
    "@6xl:[grid-template-areas:'icon_primary_chart']",
  ),
});

const iconCellStyles = tv({
  base: '[grid-area:icon]',
});

const primaryCellStyles = tv({
  base: 'flex min-w-0 items-center gap-2 [grid-area:primary]',
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
  isHovered,
  isPressed,
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
  isHovered?: boolean;
  isPressed?: boolean;
  issueSeverity?: IssueSeverity;
}) {
  const rows = (summaryData?.byServiceAndHandlerAndStatus ?? []).filter(
    (s) => s.service === service.name && s.handler === handler.name,
  );
  const statuses = buildStatusEntries(rows);
  const total = statuses.reduce((sum, s) => sum + s.count, 0);
  // When the summary is scoped to in-flight invocations (completion-history
  // feature), make the counts/labels say so.
  const isInFlightOnly = useIsFeatureFlagEnabled('FEATURE_COMPLETION_HISTORY');
  const invocationNoun = isInFlightOnly
    ? { one: 'in-flight', other: 'in-flight' }
    : { one: 'invocation', other: 'invocations' };
  const breakdownRangeLabel = isInFlightOnly
    ? ''
    : getRangeLabel(summaryData?.range);

  return (
    <div className="px-2">
      <div
        className={cardContainerStyles({ isFocusVisible })}
        {...waveAnimationProps('overview-card')}
      >
        <div
          className={cardInnerStyles({ issueSeverity, isHovered, isPressed })}
        >
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
              <div className="flex min-w-0 items-center text-[0.92675rem] leading-7 font-medium text-zinc-700 italic">
                <span className="max-w-44 min-w-0 font-normal text-zinc-500">
                  <TruncateWithTooltip copyText={service.name}>
                    {service.name}
                  </TruncateWithTooltip>
                </span>
                <span className="mx-[0.5ch] shrink-0 text-zinc-400">/</span>
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
                  className="relative shrink-0 border-none bg-gray-50 px-1 py-1 align-middle shadow-none"
                >
                  <Icon
                    name={IconName.Play}
                    className="ml-px h-3 w-3 fill-blue-300 text-blue-700/0"
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
              <span className="ml-1 shrink-0 text-0.5xs">
                <Revision revision={service.revision} />
              </span>
            </div>

            <div className={chartCellStyles()}>
              <div className="min-w-0 flex-1">
                <ServiceStatusBar
                  serviceName={service.name}
                  handlerName={handler.name}
                  data={summaryData}
                  isLoading={isSummaryLoading}
                  linkParams={linkParams}
                  noun={invocationNoun}
                  rangeLabel={breakdownRangeLabel}
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
                noun={invocationNoun}
                breakdownTooltip={
                  total > 0 ? (
                    <HandlerBreakdownTooltip
                      serviceName={service.name}
                      handlerName={handler.name}
                      statuses={statuses}
                      total={total}
                      rangeLabel={breakdownRangeLabel}
                      linkParams={linkParams}
                      noun={invocationNoun}
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
