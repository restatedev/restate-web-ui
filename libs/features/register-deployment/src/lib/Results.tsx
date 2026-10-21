import * as adminApi from '@restate/data-access-admin-api-spec';
import { Icon, IconName } from '@restate/ui-icons';
import { useRegisterDeploymentContext } from './Context';
import { Disclosure, DisclosurePanel } from 'react-aria-components';
import { Button } from '@restate/ui-button';
import { ServiceType, Handler } from '@restate/features-service';
import { Link } from '@restate/ui-link';
import { MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION } from '@restate/features-deployment';
import { PropsWithChildren } from 'react';
import { tv } from '@restate/util-styles';

const warningStyles = tv({
  base: 'mt-2 flex gap-2 rounded-xl border border-warning bg-warning-subtle p-3 text-0.5xs text-warning',
});
export function Warning({
  title,
  className,
  children,
}: PropsWithChildren<{ title: string; className?: string }>) {
  return (
    <p className={warningStyles({ className })}>
      <Icon
        className="h-5 w-5 shrink-0 fill-warning text-on-warning"
        name={IconName.TriangleAlert}
      />
      <span className="inline-block">
        <span className="font-semibold">{title}: </span>
        {children}
      </span>
    </p>
  );
}

export function DeploymentProtocolCheck() {
  const { max_protocol_version } = useRegisterDeploymentContext();

  if (
    max_protocol_version &&
    max_protocol_version < MIN_SUPPORTED_SERVICE_PROTOCOL_VERSION
  ) {
    return (
      <Warning title="Outdated SDK Version">
        This deployment uses an older SDK version (Service Protocol{' '}
        {max_protocol_version}) which will be unsupported in upcoming releases.
        To avoid service interruption, please upgrade your Restate SDK to the
        latest version and re-register this deployment. For more information,
        refer to the{' '}
        <Link
          href="https://docs.restate.dev/services/versioning#deploying-new-service-versions"
          target="_blank"
          rel="noopener noreferrer"
        >
          documentation.
        </Link>
      </Warning>
    );
  }

  return null;
}

export function RegisterDeploymentResults() {
  const { services = [] } = useRegisterDeploymentContext();
  if (services.length === 0) {
    return (
      <div className="relative mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-xl border bg-inset p-4 text-center shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)]">
        <h3 className="text-sm font-semibold text-tertiary">No services</h3>
        <p className="max-w-md px-4 text-sm text-muted">
          This deployment does not expose any services.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 flex w-full flex-col items-start gap-2">
      {services.map((service) => (
        <Service
          service={service}
          key={service.name}
          defaultExpanded={services.length < 5}
        />
      ))}
    </div>
  );
}

function Service({
  service,
  defaultExpanded,
}: {
  service: adminApi.components['schemas']['ServiceMetadata'];
  defaultExpanded?: boolean;
}) {
  return (
    <div className="w-full rounded-xl border bg-inset p-0.5 shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)]">
      <Disclosure
        defaultExpanded={defaultExpanded}
        className={({ isExpanded }) =>
          isExpanded ? '[&_.disclosure-icon]:rotate-180' : ''
        }
      >
        <div className="relative flex w-full flex-row items-center rounded-[calc(0.75rem-0.125rem)] border bg-surface p-0 pr-2 text-sm shadow-xs">
          <Button
            variant="icon"
            slot="trigger"
            className="absolute inset-0 justify-end rounded-[calc(0.75rem-0.175rem)] p-2 text-sm text-subtle hover:bg-tint-subtle pressed:bg-tint"
          >
            <Icon name={IconName.ChevronDown} className="disclosure-icon" />
          </Button>
          <div className="aspect-square h-12 p-1">
            <div className="flex h-full w-full items-center justify-center rounded-lg text-accent-subtle">
              <div className="h-8 w-8 p-1">
                <Icon
                  name={IconName.Box}
                  className="h-full w-full fill-accent-muted text-accent-subtle drop-shadow-md"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="font-medium">{service.name}</div>
              <ServiceType type={service.ty} className="ml-auto" />
            </div>
          </div>
          <div className="mr-7 ml-auto items-center rounded-xl bg-subtle px-2 font-mono text-2xs leading-4 font-semibold text-muted uppercase ring-1 ring-tint ring-inset">
            rev. {service.revision}
          </div>
        </div>
        <DisclosurePanel>
          {service.info?.map((info) => (
            <Warning key={info.code} title={'Warning'} className="mx-2">
              {info.message}
            </Warning>
          ))}
          {(service.handlers ?? []).length > 0 && (
            <div className="mx-1.5 mt-2 mb-1.5 flex flex-col">
              <div className="mt-2 mb-1 ml-2 flex items-center gap-2 text-xs font-semibold text-subtle uppercase">
                Handlers
              </div>
              <div className="mt-2 flex flex-col gap-2 pl-1.5">
                {service.handlers.map((handler) => (
                  <Handler
                    handler={handler}
                    key={handler.name}
                    service={service.name}
                    serviceType={service.ty}
                  />
                ))}
              </div>
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}
