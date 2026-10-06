import { DELETE_DEPLOYMENT_QUERY_PARAM } from '@restate/features/deployment';
import { DropdownItem } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
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
        'flex translate-x-px items-center gap-1 rounded-l-lg rounded-r-none px-2 py-0.5 text-[0.9375rem] [line-height:inherit] whitespace-nowrap max-md:hidden',
    },
    destructive: {
      true: '',
      false: 'text-blue-700',
    },
  },
  compoundVariants: [
    { variant: 'row', destructive: true, className: 'text-red-600' },
    { variant: 'header', destructive: true, className: 'text-red-500' },
  ],
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
    ? {
        href: updateHref,
        label: 'Update',
        icon: IconName.Pencil,
        destructive: false,
      }
    : {
        href: deleteHref,
        label: 'Delete',
        icon: IconName.Trash,
        destructive: true,
      };
  const isHeader = variant === 'header';

  return (
    <SplitButton
      mini={isHeader ? 'md' : true}
      variant="secondary"
      className={isHeader ? 'rounded-l-lg text-[0.9375rem]' : undefined}
      splitClassName={isHeader ? 'rounded-lg md:rounded-l-none' : undefined}
      menus={
        <>
          {isUpdateSupported && (
            <DropdownItem href={updateHref}>
              {isHeader && (
                <Icon
                  name={IconName.Pencil}
                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                />
              )}
              Update
            </DropdownItem>
          )}
          <DropdownItem href={deleteHref} destructive>
            {isHeader && (
              <Icon
                name={IconName.Trash}
                className="h-3.5 w-3.5 shrink-0 opacity-80"
              />
            )}
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
        {isHeader && (
          <Icon
            name={primaryAction.icon}
            className="h-[0.9em] w-[0.9em] shrink-0 opacity-80"
          />
        )}
        {primaryAction.label}
      </Link>
    </SplitButton>
  );
}
