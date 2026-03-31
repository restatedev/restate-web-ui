import { type PropsWithChildren, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { ErrorBanner } from '@restate/ui/error';
import type { IssueSeverity } from '@restate/features/system-health';
import { issueBannerStyles, issuePingStyles, issueDotStyles } from './styles';

export function IssueBannerPill({
  severity,
  children,
  details,
}: PropsWithChildren<{
  severity: IssueSeverity;
  details?: ReactNode | Error;
}>) {
  const content = (
    <div className={issueBannerStyles()}>
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={issuePingStyles({ severity })} />
        <span className={issueDotStyles({ severity })} />
      </span>
      <span className="min-w-0 truncate">{children}</span>
      {details && (
        <Icon
          name={IconName.Info}
          className="h-3.5 w-3.5 shrink-0 text-zinc-400"
        />
      )}
    </div>
  );

  if (!details) return content;

  return (
    <Popover>
      <PopoverTrigger>
        <Button
          variant="icon"
          className={issueBannerStyles({ interactive: true })}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={issuePingStyles({ severity })} />
            <span className={issueDotStyles({ severity })} />
          </span>
          <span className="min-w-0 truncate">{children}</span>
          <Icon
            name={IconName.Info}
            className="h-3.5 w-3.5 shrink-0 text-zinc-400"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md">
        <div className="-m-px rounded-2xl border border-zinc-900/80 bg-zinc-800/90 p-3 shadow-[inset_0_1px_0_0_var(--color-gray-500)] drop-shadow-xl backdrop-blur-xl">
          {details instanceof Error ? (
            <ErrorBanner
              error={details}
              className="w-full rounded-md bg-white/5 [&_*]:text-orange-300! [&_code]:border-transparent [&_code]:bg-zinc-800/30 [&_code]:mix-blend-normal [&_svg]:h-3.5 [&_svg]:w-3.5"
            />
          ) : (
            <div className="text-xs text-zinc-300">{details}</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
