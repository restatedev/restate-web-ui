import {
  TabCountBadge,
  type TabBadge,
} from '@restate/features/invocations-route';

export function InvocationsTabLabel({
  badge,
  isLoading,
}: {
  badge: TabBadge | undefined;
  isLoading: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      Invocations
      <TabCountBadge badge={badge} isLoading={isLoading} />
    </span>
  );
}
