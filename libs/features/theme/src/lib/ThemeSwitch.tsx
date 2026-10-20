import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { Icon, IconName } from '@restate/ui-icons';
import type { ReactNode } from 'react';
import { Button } from 'react-aria-components';
import type { ThemePreference } from './themePreference';
import { useThemePreference } from './useThemePreference';

const OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'System', icon: IconName.Monitor },
  { value: 'light', label: 'Light', icon: IconName.Sun },
  { value: 'dark', label: 'Dark', icon: IconName.Moon },
];

export function ThemeSwitch({
  className,
  children,
}: {
  className?: string;
  children: (option: { label: string; icon: IconName }) => ReactNode;
}) {
  const [preference, setPreference] = useThemePreference();
  const current =
    OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0]!;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button className={className} aria-label="Theme">
          {children(current)}
        </Button>
      </DropdownTrigger>
      <DropdownPopover placement="right bottom">
        <DropdownMenu
          selectable
          selectedItems={[preference]}
          onSelect={(key) => setPreference(key as ThemePreference)}
          aria-label="Theme"
        >
          {OPTIONS.map((option) => (
            <DropdownItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <Icon name={option.icon} className="h-4 w-4" />
                {option.label}
              </span>
            </DropdownItem>
          ))}
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
