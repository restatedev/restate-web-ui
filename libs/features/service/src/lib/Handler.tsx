import {
  Handler as HandlerType,
  ServiceType,
} from '@restate/data-access-admin-api-spec';
import { HandlerInputOutput } from '@restate/features-handler-input-output';
import { HandlerTypeExplainer } from '@restate/features-explainers';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import { TruncateWithTooltip } from '@restate/ui-tooltip';
import { Badge } from '@restate/ui-badge';
import { Link } from '@restate/ui-link';
import { serviceHref } from '@restate/util-panel';
import { useRestateContext } from '@restate/features-restate-context';

const styles = tv({
  slots: {
    base: 'relative flex flex-row flex-wrap items-center pr-2',
    iconBox: 'flex h-[1.75rem] items-center',
    name: 'min-w-0 flex-auto text-0.5xs leading-[1.75rem] font-medium text-tertiary italic',
    link: "my-0.5 ml-auto shrink-0 rounded-full before:absolute before:-top-0.5 before:-right-1 before:-bottom-0.5 before:-left-1 before:z-[0] before:rounded-lg before:content-[''] hover:bg-transparent hover:before:bg-tint-subtle",
  },
  variants: {
    compact: {
      true: { iconBox: 'h-6.5', name: 'leading-6.5', link: 'my-0' },
    },
  },
});

export function Handler({
  handler,
  className,
  service,
  serviceType,
  showLink,
  showType = true,
  compact = false,
}: {
  handler: HandlerType;
  className?: string;
  service: string;
  serviceType?: ServiceType;
  showLink?: boolean;
  showType?: boolean;
  compact?: boolean;
}) {
  const { base, iconBox, name, link } = styles({ compact });
  const { baseUrl } = useRestateContext();
  return (
    <div className={base({ className })}>
      <div className="flex min-w-0 flex-auto flex-row items-end gap-2">
        <div className={iconBox()}>
          <div
            className="h-6 w-6 shrink-0 rounded-md border bg-surface shadow-xs"
            data-icon
          >
            <Icon
              name={IconName.Function}
              className="h-full w-full text-subtle"
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-auto flex-row flex-wrap items-center justify-start gap-x-1.5">
          {handler.ty &&
            serviceType &&
            serviceType !== 'Service' &&
            showType && (
              <Badge
                size="sm"
                className="border-none bg-transparent px-0 py-0 text-xs font-medium text-subtle"
              >
                <HandlerTypeExplainer type={handler.ty} variant="inline-help">
                  {handler.ty}
                </HandlerTypeExplainer>
              </Badge>
            )}
          <div className={name()}>
            <span className="flex items-center">
              <TruncateWithTooltip copyText={handler.name}>
                {handler.name}
              </TruncateWithTooltip>
              <span className="shrink-0 text-subtle">{'('}</span>
              <HandlerInputOutput
                jsonSchema={handler.input_json_schema}
                contentType={handler.input_description}
                label="Request"
                className="[&_a]:z-[2] [&_button]:text-subtle"
              />
              <span className="shrink-0 text-subtle">
                {')'}
                <span className="mx-[0.5ch] text-muted">→</span>
              </span>
              <HandlerInputOutput
                jsonSchema={handler.output_json_schema}
                contentType={handler.output_description}
                label="Response"
                className="[&_a]:z-[2] [&_button]:text-subtle"
              />
              {showLink && (
                <Link
                  variant="icon"
                  href={serviceHref(baseUrl, {
                    service,
                    handler: handler.name,
                  })}
                  className={link()}
                >
                  <Icon
                    name={IconName.ChevronRight}
                    className="h-4 w-4 text-subtle"
                  />
                </Link>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
