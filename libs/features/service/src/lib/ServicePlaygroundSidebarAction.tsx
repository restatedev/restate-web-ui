import { useState } from 'react';
import { Button } from '@restate/ui/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownSection,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { panelHref } from '@restate/util/panel';

export function ServicePlaygroundSidebarAction({
  className,
}: {
  className?: string;
}) {
  const { data } = useListDeployments();
  const serviceNames = data?.sortedServiceNames ?? [];
  const disabled = serviceNames.length === 0;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger>
        <HoverTooltip
          content="Open in Playground"
          placement="top"
          disabled={disabled || isOpen}
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
