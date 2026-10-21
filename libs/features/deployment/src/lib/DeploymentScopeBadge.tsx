import { useSchemaRegistry } from '@restate/data-access-admin-api';
import { Badge } from '@restate/ui-badge';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: 'shrink-0 gap-1 py-0.5!',
});

export function DeploymentScopeBadge({
  metadata,
  className,
}: {
  metadata?: Record<string, string> | null;
  className?: string;
}) {
  const registry = useSchemaRegistry();
  if (!registry) {
    return null;
  }
  const tenant = metadata?.['tenant'];
  const isOwn = tenant !== undefined && tenant === registry.scope;

  return (
    <HoverTooltip
      content={
        isOwn
          ? `Registered for ${registry.scope}`
          : 'Shared by every tenant; a tenant deployment of the same service takes precedence'
      }
      contentClassName="max-w-64 break-normal"
    >
      <Badge
        size="sm"
        variant={isOwn ? 'info' : 'default'}
        className={styles({ className })}
      >
        <Icon
          name={isOwn ? IconName.Scope : IconName.Users}
          className="h-3 w-3 shrink-0"
        />
        {isOwn ? 'Tenant' : 'Shared'}
      </Badge>
    </HoverTooltip>
  );
}
