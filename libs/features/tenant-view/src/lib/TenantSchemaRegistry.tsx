import {
  SchemaRegistryProvider,
  useSchemaRegistry,
} from '@restate/data-access-admin-api';
import { useRestateContext } from '@restate/features-restate-context';
import { EmptyState } from '@restate/ui-empty-state';
import { ErrorBanner } from '@restate/ui-error';
import { IconName } from '@restate/ui-icons';
import type { PropsWithChildren } from 'react';

export function TenantSchemaRegistry({
  scope,
  children,
}: PropsWithChildren<{ scope: string }>) {
  const { schemaRegistryUrl } = useRestateContext();

  if (!schemaRegistryUrl) {
    return (
      <div className="px-5 py-20">
        <EmptyState
          icon={IconName.Box}
          title="No schema registry"
          description="This Restate server doesn’t advertise a schema registry, so the tenant’s services and deployments can’t be shown."
        />
      </div>
    );
  }

  return (
    <SchemaRegistryProvider baseUrl={schemaRegistryUrl} scope={scope}>
      {children}
    </SchemaRegistryProvider>
  );
}

export function SchemaRegistryError({ className }: { className?: string }) {
  const registry = useSchemaRegistry();
  if (!registry?.error) {
    return null;
  }
  return <ErrorBanner error={registry.error} className={className} />;
}
