import { useState } from 'react';
import { Button } from '@restate/ui-button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { Icon, IconName } from '@restate/ui-icons';
import { HoverTooltip } from '@restate/ui-tooltip';
import {
  useListDeployments,
  useServiceCatalog,
} from '@restate/data-access-admin-api-hooks';
import { isPublicService } from '@restate/data-access-admin-api-spec';
import { panelHref } from '@restate/util-panel';
import { tv } from '@restate/util-styles';

const styles = tv({
  base: '',
  variants: {
    disabled: {
      true: 'invisible',
      false: '',
    },
  },
});
export function ServicePlaygroundSidebarAction({
  className,
}: {
  className?: string;
}) {
  const { data } = useListDeployments();
  const { data: catalog } = useServiceCatalog();
  const serviceNames = (data?.sortedServiceNames ?? []).filter((name) =>
    isPublicService(catalog.get(name)),
  );
  const disabled = serviceNames.length === 0;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <HoverTooltip
          content="Open in Playground"
          placement="top"
          disabled={disabled || isOpen}
          className={styles({ disabled })}
        >
          <Button
            variant="icon"
            className={className}
            aria-label="Open in Playground"
            disabled={disabled}
          >
            <Icon name={IconName.Play} className="h-3.5 w-3.5" />
          </Button>
        </HoverTooltip>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownSection title="Open in Playground">
          <DropdownMenu>
            {serviceNames.map((name) => (
              <DropdownItem key={name} href={panelHref({ playground: name })}>
                {name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </DropdownSection>
      </DropdownPopover>
    </Dropdown>
  );
}
