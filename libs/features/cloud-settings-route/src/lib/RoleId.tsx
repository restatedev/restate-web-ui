import { Role } from '@restate/data-access/cloud/api-client';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: '[text-decoration:none] bg-blue-50 text-blue-800 ring-blue-600/20 inline-flex gap-1 items-center rounded-md px-2 py-0 text-sm font-medium ring-1 ring-inset',
});

const DESCRIPTIONS: Record<Role, string> = {
  'rst:role::FullAccess': 'Full',
  'rst:role::IngressAccess': 'Ingress',
  'rst:role::AdminAccess': 'Admin',
  'rst:role::CompleteAwakeableAccess': 'Complete Awakeable',
};

export function RoleId({ roleId }: { roleId: Role }) {
  return <div className={styles({})}>{DESCRIPTIONS[roleId]}</div>;
}
