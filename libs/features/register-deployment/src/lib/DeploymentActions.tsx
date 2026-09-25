import { DELETE_DEPLOYMENT_QUERY_PARAM } from '@restate/features/deployment';
import { DropdownItem } from '@restate/ui/dropdown';
import { Link } from '@restate/ui/link';
import { SplitButton } from '@restate/ui/split-button';
import { tv } from '@restate/util/styles';
import { UPDATE_DEPLOYMENT_QUERY } from './constant';

const primaryStyles = tv({
  base: '',
  variants: {
    variant: {
      row: 'invisible absolute right-full z-2 flex translate-x-px items-center gap-1 rounded-l-md rounded-r-none px-2 py-0.5 [font-size:inherit] [line-height:inherit] whitespace-nowrap drop-shadow-[-20px_2px_4px_--theme(--color-gray-100/0.5)] group-hover:visible',
      header:
        'rounded-l-lg rounded-r-none px-3 py-0 text-xs leading-7 font-medium',
    },
    destructive: {
      true: 'text-red-600',
      false: 'text-blue-700',
    },
  },
});

export function DeploymentActions({
  deploymentId,
  isUpdateSupported,
  variant = 'row',
}: {
  deploymentId: string;
  isUpdateSupported?: boolean;
  variant?: 'row' | 'header';
}) {
  const updateHref = `?${UPDATE_DEPLOYMENT_QUERY}=${deploymentId}`;
  const deleteHref = `?${DELETE_DEPLOYMENT_QUERY_PARAM}=${deploymentId}`;
  const primaryAction = isUpdateSupported
    ? { href: updateHref, label: 'Update', destructive: false }
    : { href: deleteHref, label: 'Delete', destructive: true };

  return (
    <SplitButton
      mini={variant === 'row'}
      variant="secondary"
      className={variant === 'header' ? 'py-0 text-xs' : undefined}
      splitClassName={
        variant === 'header'
          ? 'w-7 rounded-r-lg [&_svg]:h-4 [&_svg]:w-4'
          : undefined
      }
      menus={
        <>
          {isUpdateSupported && (
            <DropdownItem href={updateHref}>Update</DropdownItem>
          )}
          <DropdownItem href={deleteHref} destructive>
            Delete
          </DropdownItem>
        </>
      }
    >
      <Link
        href={primaryAction.href}
        variant="secondary-button"
        className={primaryStyles({
          variant,
          destructive: primaryAction.destructive,
        })}
      >
        {primaryAction.label}
      </Link>
    </SplitButton>
  );
}
