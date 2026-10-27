import { BatchOperationsProvider } from '@restate/features-batch-operations';
import { BreadcrumbsProvider } from '@restate/features-breadcrumbs';
import { deploymentRoute } from '@restate/features-deployment-route';
import { InvocationActions } from '@restate/features-invocation-route';
import { overview } from '@restate/features-overview-route';
import { RegisterDeploymentDialog } from '@restate/features-register-deployment';
import { useRestateContext } from '@restate/features-restate-context';
import { TriggerWorkflowDialog } from '@restate/features-service';
import { serviceRoute } from '@restate/features-service-route';
import { ServiceTargetProvider } from '@restate/features-service-target';
import { IconName } from '@restate/ui-icons';
import { ListPageHeader } from '@restate/ui-layout';
import type { PropsWithChildren } from 'react';
import {
  SchemaRegistryError,
  TenantSchemaRegistry,
} from './TenantSchemaRegistry';
import { TenantServiceTarget } from './TenantServiceTarget';

export interface TenantCatalogProps {
  scope: string;
}

export function TenantOverview({ scope }: TenantCatalogProps) {
  return (
    <TenantSchemaRegistry scope={scope}>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ListPageHeader icon={IconName.Box} title="Services and deployments">
          The deployments and services registered for{' '}
          <span className="font-mono">{scope}</span> in the schema registry.
        </ListPageHeader>
        <SchemaRegistryError className="mx-4 mb-4 rounded-xl" />
        <overview.Component />
      </div>
      <TriggerWorkflowDialog />
      <RegisterDeploymentDialog />
    </TenantSchemaRegistry>
  );
}

function TenantDetailsPage({
  scope,
  children,
}: PropsWithChildren<TenantCatalogProps>) {
  const { baseUrl } = useRestateContext();
  return (
    <TenantSchemaRegistry scope={scope}>
      <ServiceTargetProvider component={TenantServiceTarget}>
        <BreadcrumbsProvider patternPrefix={baseUrl.replace(/\/$/, '')}>
          <BatchOperationsProvider showScope={false}>
            <SchemaRegistryError className="mx-5 mt-4 rounded-xl" />
            {children}
          </BatchOperationsProvider>
        </BreadcrumbsProvider>
        <InvocationActions />
        <TriggerWorkflowDialog />
      </ServiceTargetProvider>
    </TenantSchemaRegistry>
  );
}

export function TenantService({ scope }: TenantCatalogProps) {
  return (
    <TenantDetailsPage scope={scope}>
      <serviceRoute.Component />
    </TenantDetailsPage>
  );
}

export function TenantDeployment({ scope }: TenantCatalogProps) {
  return (
    <TenantDetailsPage scope={scope}>
      <deploymentRoute.Component />
    </TenantDetailsPage>
  );
}
