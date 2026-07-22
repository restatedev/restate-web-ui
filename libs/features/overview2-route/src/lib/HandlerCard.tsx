import type { Handler, Service } from '@restate/data-access/admin-api-spec';
import { cx, tv } from '@restate/util/styles';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { panelHref } from '@restate/util/panel';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { toServiceAndHandlerInvocationsHref } from '@restate/util/invocation-links';
import { Revision } from '@restate/features/deployment';
import { HandlerInputOutput } from '@restate/feature/handler-input-output';
import { waveAnimationProps } from '@restate/ui/wave-animation';
import {
  cardActionLinkStyles,
  cardContainerStyles,
  cardInnerStyles,
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
  linkParams,
  isFocusVisible,
  isHovered,
  isPressed,
}: {
  service: Service;
  handler: Handler;
  baseUrl: string;
  linkParams?: URLSearchParams;
  isFocusVisible?: boolean;
  isHovered?: boolean;
  isPressed?: boolean;
}) {
  return (
    <div className="px-2">
      <div
        className={cardContainerStyles({ isFocusVisible })}
        {...waveAnimationProps('overview-card')}
      >
        <div className={cardInnerStyles({ isHovered, isPressed })}>
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
              <span className="ml-1 shrink-0 text-0.5xs">
                <Revision revision={service.revision} />
              </span>
            </div>

            <div className={chartCellStyles()}>
              <Link
                href={toServiceAndHandlerInvocationsHref(
                  baseUrl,
                  service.name,
                  handler.name,
                  { existingParams: linkParams },
                )}
                variant="secondary"
                className={cardActionLinkStyles({ class: 'ml-auto' })}
              >
                <div className="min-w-0 truncate">Invocations</div>
                <Icon name={IconName.ChevronRight} className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
