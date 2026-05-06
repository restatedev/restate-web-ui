import type { ReactNode } from 'react';
import type {
  SidebarLocation,
  SidebarMatch,
  SidebarNavOverflowDynamic,
} from '@restate/ui/layout';

interface CreateSectionOverflowOptions {
  sectionMatch: SidebarMatch;
  subItemMatchers: SidebarMatch[];
  detailMatch?: SidebarMatch;
  detailLabel?: (loc: SidebarLocation) => ReactNode;
  fallbackLabel: ReactNode;
}

export function createSectionOverflow({
  sectionMatch,
  subItemMatchers,
  detailMatch,
  detailLabel,
  fallbackLabel,
}: CreateSectionOverflowOptions): SidebarNavOverflowDynamic {
  return {
    match: (loc) => {
      if (detailMatch?.(loc)) return true;
      if (!sectionMatch(loc)) return false;
      return !subItemMatchers.some((m) => m(loc));
    },
    label: (loc) => {
      if (detailMatch?.(loc) && detailLabel) return detailLabel(loc);
      return fallbackLabel;
    },
  };
}
