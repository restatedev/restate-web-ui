import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui-popover';
import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { formatPlurals } from '@restate/util-intl';
import { toServiceStatusInvocationsHref } from '@restate/util-invocation-links';
import type { ServiceIssue } from '@restate/features-system-health';
import {
  issueButtonStyles,
  issuePingStyles,
  issueIconStyles,
  issueDotStyles,
} from './styles';

export function IssueBadge({
  issues,
  serviceName,
  baseUrl,
  onOpenChange,
}: {
  issues: ServiceIssue[];
  serviceName: string;
  baseUrl: string;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const hasHigh = useMemo(
    () => issues.some((i) => i.severity === 'high'),
    [issues],
  );
  const severity = hasHigh ? 'high' : 'low';

  if (issues.length === 0) {
    return null;
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger>
        <Button variant="secondary" className={issueButtonStyles({ severity })}>
          <div className="relative mx-0.5 flex h-2.5 w-2.5 shrink-0">
            <Icon
              name={IconName.TriangleAlert}
              className={issuePingStyles({ severity })}
            />
            <Icon
              name={IconName.TriangleAlert}
              className={issueIconStyles({ severity })}
            />
          </div>
          <span className="font-medium">{issues.length} </span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="block h-3.5 w-3.5 shrink-0 opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-lg">
        <div className="flex flex-col gap-1 rounded-2xl border border-inverse bg-inverse/90 p-3 pb-1.5 shadow-[inset_0_1px_0_0_var(--background-color-inverse-strong)] drop-shadow-xl backdrop-blur-xl">
          <div className="text-0.5xs font-medium text-inverse-muted">
            {issues.length}{' '}
            {formatPlurals(issues.length, {
              one: 'issue',
              other: 'issues',
            })}
          </div>
          <div className="flex flex-col pt-1">
            {issues.map((issue, i) => {
              const href =
                issue.kind === 'sla' && issue.status
                  ? toServiceStatusInvocationsHref(
                      baseUrl,
                      serviceName,
                      issue.status,
                    )
                  : undefined;
              const content = (
                <>
                  <span
                    className={issueDotStyles({
                      severity: issue.severity,
                      className: 'shrink-0',
                    })}
                  />
                  <span>{issue.label}</span>
                  {href && (
                    <Icon
                      name={IconName.ChevronRight}
                      className="ml-auto h-3.5 w-3.5 shrink-0 text-inverse-secondary"
                    />
                  )}
                </>
              );
              return href ? (
                <Link
                  key={i}
                  href={href}
                  variant="secondary"
                  className="-mx-2 flex items-center gap-2 rounded-lg border-none bg-transparent px-2 py-1 text-0.5xs text-inverse-secondary no-underline shadow-none hover:bg-inverse-tint-subtle pressed:bg-inverse-tint"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1 text-0.5xs text-inverse-secondary"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
