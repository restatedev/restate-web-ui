import {
  ServiceTargetContent,
  type ServiceTargetProps,
} from '@restate/features/service-target';
import type { PropsWithChildren } from 'react';

export function TenantServiceTarget(
  props: PropsWithChildren<ServiceTargetProps>,
) {
  return <ServiceTargetContent {...props} scope={undefined} links={false} />;
}
