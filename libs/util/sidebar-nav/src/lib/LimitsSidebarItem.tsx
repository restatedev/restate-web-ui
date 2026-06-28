import {
  SidebarNavItem,
  type SidebarLocation,
  type SidebarSubItem,
} from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';
import { useLocation } from 'react-router';
import { useLimitsRecent } from './useLimitsMemory';
import type { LimitsRecent } from './limitsRecent';

// The `tab` search param on a rule page. Absent → the rule's own (Counters)
// view; present → a specific counter (match) within the rule. Kept in lockstep
// with TAB_QUERY_PARAM in limits-route; this lib can't depend on the feature.
const TAB_PARAM = 'tab';

interface LimitsSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

// Classify a limits URL into the thing worth remembering, or null when not on a
// rule/counter page (the rules list, or outside the section entirely). The
// current URL is the source of truth; the in-memory `recent` only fills the
// slot once you navigate away.
function classifyLimitsUrl(
  rulesPath: string,
  pathname: string,
  searchParams: URLSearchParams,
): LimitsRecent | null {
  const detail = pathname.match(new RegExp(`^${rulesPath}/([^/]+)`));
  if (!detail?.[1]) return null;
  const pattern = decodeURIComponent(detail[1]);
  const tab = searchParams.get(TAB_PARAM);
  if (tab) return { type: 'counter', pattern, match: tab };
  return { type: 'rule', pattern };
}

function ruleHref(rulesPath: string, pattern: string): string {
  return `${rulesPath}/${encodeURIComponent(pattern)}`;
}

function counterHref(
  rulesPath: string,
  pattern: string,
  match: string,
): string {
  const params = new URLSearchParams();
  params.set('match', match);
  params.set(TAB_PARAM, match);
  return `${ruleHref(rulesPath, pattern)}?${params.toString()}`;
}

export function LimitsSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = false,
}: LimitsSidebarItemProps) {
  const rulesPath = `${baseUrl}/limits/rules`;
  const { recent } = useLimitsRecent();
  const location = useLocation();
  const classify = (loc: SidebarLocation) =>
    classifyLimitsUrl(rulesPath, loc.pathname, loc.searchParams);
  const current = classifyLimitsUrl(
    rulesPath,
    location.pathname,
    new URLSearchParams(location.search),
  );

  // Current URL beats memory: a rule/counter you're looking at shows (active);
  // otherwise fall back to the last one you visited (not active).
  const entry = current ?? recent;

  const extraSubItems: SidebarSubItem[] = [];
  if (entry?.type === 'rule') {
    const pattern = entry.pattern;
    extraSubItems.push({
      href: ruleHref(rulesPath, pattern),
      label: (
        <span className="min-w-0 flex-auto truncate font-mono">{pattern}</span>
      ),
      match: (loc) => {
        const k = classify(loc);
        return k?.type === 'rule' && k.pattern === pattern;
      },
      preserveSearchParams: false,
    });
  } else if (entry?.type === 'counter') {
    const { pattern, match } = entry;
    extraSubItems.push({
      href: counterHref(rulesPath, pattern, match),
      label: (
        <span className="min-w-0 flex-auto truncate font-mono">{match}</span>
      ),
      match: (loc) => {
        const k = classify(loc);
        return (
          k?.type === 'counter' && k.pattern === pattern && k.match === match
        );
      },
      preserveSearchParams: false,
    });
  }

  return (
    <SidebarNavItem
      href={rulesPath}
      icon={IconName.SlidersHorizontal}
      label="Limits"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      extraSubItems={extraSubItems}
    />
  );
}
