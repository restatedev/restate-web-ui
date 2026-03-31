import { useState } from 'react';
import {
  useIssueQueue,
  type IssueContent,
} from '@restate/features/system-health';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { formatPlurals } from '@restate/util/intl';
import { issueBannerStyles } from './styles';
import { IssueBannerPill } from './IssueBannerPill';

export function IssuesBannerStack() {
  const toasts = useIssueQueue();
  const issues = toasts.map((t: { content: IssueContent }) => t.content);
  const [expanded, setExpanded] = useState(false);

  if (issues.length === 0) return null;

  if (issues.length === 1) {
    const issue = issues[0]!;
    return (
      <div className="animate-in fade-in zoom-in-95 duration-300">
        <IssueBannerPill severity={issue.severity} details={issue.details}>
          {issue.label}
        </IssueBannerPill>
      </div>
    );
  }

  const maxStacked = 3;
  const stackCount = Math.min(issues.length, maxStacked);

  return (
    <div className="flex animate-in fade-in zoom-in-95 flex-col items-center duration-300">
      <div className="relative flex flex-col-reverse items-center">
        <Button
          variant="icon"
          className={issueBannerStyles({ interactive: true, elevated: true })}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="relative flex h-4 w-4 shrink-0">
            <Icon
              name={IconName.TriangleAlert}
              className="absolute h-4 w-4 animate-ping fill-amber-300 text-amber-800 opacity-60"
            />
            <Icon
              name={IconName.TriangleAlert}
              className="relative h-4 w-4 fill-amber-300 text-amber-800"
            />
          </span>
          <span>
            <span className="font-semibold text-white">Attention</span>
            <span className="mx-1.5 text-zinc-500">—</span>
            {issues.length}{' '}
            {formatPlurals(issues.length, { one: 'issue', other: 'issues' })}{' '}
            detected that may need your attention
          </span>
          <Icon
            name={IconName.ChevronsUpDown}
            className="h-3.5 w-3.5 shrink-0 text-zinc-300"
          />
        </Button>
        {Array.from({ length: stackCount - 1 }, (_, i) => {
          const depth = i + 1;
          return (
            <div
              key={i}
              className="w-full origin-[bottom_center] rounded-xl backdrop-blur-3xl transition-all duration-300 ease-out"
              style={{
                marginBottom: expanded ? 0 : -10,
                transform: expanded ? 'scale(1)' : `scale(${1 - depth * 0.15})`,
                opacity: expanded ? 0 : 1 - depth * 0.25,
                maxHeight: expanded ? 0 : 40,
              }}
              aria-hidden
            >
              <div className={issueBannerStyles({ full: true })}>
                <span className="h-2 w-2 shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="flex flex-col items-center gap-1.5 overflow-hidden p-1 transition-all duration-300 ease-out"
        style={{
          maxHeight: expanded ? issues.length * 60 : 0,
          marginTop: expanded ? 8 : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        {issues.map((issue, i) => (
          <IssueBannerPill
            key={i}
            severity={issue.severity}
            details={issue.details}
          >
            {issue.label}
          </IssueBannerPill>
        ))}
      </div>
    </div>
  );
}
