import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { formatPlurals } from '@restate/util/intl';
import { toServiceStatusInvocationsHref } from '@restate/util/invocation-links';
import type { ServiceIssue } from '@restate/features/system-health';
import {
  issueButtonStyles,
  issuePingStyles,
  issueDotStyles,
  issueAlertIconStyles,
} from './styles';

export function IssueBadge({
  issues,
  serviceName,
  baseUrl,
}: {
  issues: ServiceIssue[];
  serviceName: string;
  baseUrl: string;
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
    <div className="flex min-w-0 flex-col">
      <Popover>
        <PopoverTrigger>
          <Button
            variant="secondary"
            className={issueButtonStyles({ severity })}
          >
            <Icon
              name={IconName.TriangleAlert}
              className={issueAlertIconStyles({
                severity,
                className: 'h-4 w-4 shrink-0 xl:hidden',
              })}
            />
            <div className="relative mx-0.5 hidden h-2 w-2 shrink-0 xl:flex">
              <span className={issuePingStyles({ severity })} />
              <span className={issueDotStyles({ severity })} />
            </div>
            <span className="hidden font-semibold xl:inline">
              {issues.length}{' '}
            </span>
            <Icon
              name={IconName.ChevronsUpDown}
              className="hidden h-3.5 w-3.5 shrink-0 opacity-50 xl:block"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-w-lg">
          <div className="flex flex-col gap-1 rounded-2xl border border-zinc-900/80 bg-zinc-800/90 p-3 pb-1.5 shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-xl">
            <div className="text-0.5xs font-medium text-zinc-400">
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
                        className="ml-auto h-3.5 w-3.5 shrink-0 text-zinc-300"
                      />
                    )}
                  </>
                );
                return href ? (
                  <Link
                    key={i}
                    href={href}
                    variant="secondary"
                    className="-mx-2 flex items-center gap-2 rounded-lg border-none bg-transparent px-2 py-1 text-0.5xs text-zinc-300 no-underline shadow-none hover:bg-white/10 pressed:bg-white/15"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1 text-0.5xs text-zinc-300"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <div>
        <br />
      </div>
    </div>
  );
}
