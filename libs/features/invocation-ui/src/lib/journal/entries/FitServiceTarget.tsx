import { ServiceTarget } from '@restate/features-service-target';
import { tv } from '@restate/util-styles';
import { getFitTargetSegments } from '../fitRows';

const MIN_WIDTH =
  'min-w-20 @max-[540px]/journal:min-w-16 @max-[420px]/journal:min-w-7';
const CROWDED_MIN_WIDTH =
  'min-w-16 @max-[540px]/journal:min-w-12 @max-[420px]/journal:min-w-7';

const styles = tv({
  slots: {
    root: '[&_[data-target-icon]]:size-3 @max-[540px]/journal:[&_[data-target-icon]]:hidden @max-[860px]/journal:[&_[data-target-link-chevron]]:hidden',
    service: 'ml-0.5 flex-[0_10000_auto] [&_[data-chip-segment-inner]]:pl-1.5',
    serviceKey:
      'mr-0.5 flex-[0_100000000_auto] [&_[data-chip-segment-inner]]:pl-1.5 [&_[data-chip-segment-inner]]:text-[100%] @max-[860px]/journal:[&_[data-chip-segment-inner]]:pr-2',
    scope: 'ml-0.5 flex-[0_1000000_auto] @max-[420px]/journal:hidden',
  },
  variants: {
    scope: {
      long: { scope: CROWDED_MIN_WIDTH },
      crowded: { scope: CROWDED_MIN_WIDTH },
      short: { scope: 'shrink-0' },
    },
    service: {
      long: { service: MIN_WIDTH },
      crowded: { service: CROWDED_MIN_WIDTH },
      short: { service: 'shrink-0' },
    },
    serviceKey: {
      long: { serviceKey: MIN_WIDTH },
      crowded: { serviceKey: CROWDED_MIN_WIDTH },
      short: { serviceKey: 'shrink-0' },
    },
    hasKey: {
      true: '',
      false: {
        service:
          'mr-0.5 @max-[860px]/journal:[&_[data-chip-segment-inner]]:pr-2',
      },
    },
  },
});

export function FitServiceTarget({
  scope,
  service,
  serviceKey,
  handler,
}: {
  scope?: string;
  service: string;
  serviceKey?: string;
  handler: string;
}) {
  const {
    root,
    service: serviceStyle,
    serviceKey: serviceKeyStyle,
    scope: scopeStyle,
  } = styles({
    ...getFitTargetSegments(service, serviceKey, scope),
    hasKey: typeof serviceKey === 'string',
  });

  return (
    <ServiceTarget
      scope={scope}
      service={service}
      serviceKey={serviceKey}
      handler={handler}
      showHandler={false}
      density="tight"
      className={root()}
      chipClassName="font-sans text-2xs not-italic"
      flat
      segmentClassNames={{
        scope: scopeStyle(),
        service: serviceStyle(),
        serviceKey: serviceKeyStyle(),
      }}
    />
  );
}
