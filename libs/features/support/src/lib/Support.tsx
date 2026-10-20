import { Button } from '@restate/ui-button';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui-popover';
import { PropsWithChildren } from 'react';
import { Header } from 'react-aria-components';

export function Support({ children }: PropsWithChildren) {
  return (
    <Popover>
      <Help />
      <PopoverContent>
        <div className="p-1 pt-0">
          <Header className="truncate px-4 py-1 pt-2 text-sm font-semibold text-muted">
            Do you need help?
          </Header>
          <div className="flex flex-col gap-1">
            <Link
              variant="secondary-button"
              href="https://docs.restate.dev/"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 text-0.5xs font-medium"
            >
              <Icon
                name={IconName.Docs}
                className="h-[1.25em] w-[1.25em] text-secondary"
              />
              Read documentation…
            </Link>
            <Link
              variant="secondary-button"
              href="https://discord.gg/skW3AZ6uGd"
              target="_blank"
              rel="noreferrer noopener"
              className="justify2-center flex items-center gap-2 text-0.5xs font-medium"
            >
              <Icon
                name={IconName.Discord}
                className="h-[1.25em] w-[1.25em] text-secondary"
              />
              Join Discord…
            </Link>
            <Link
              variant="secondary-button"
              href="https://join.slack.com/t/restatecommunity/shared_invite/zt-2v9gl005c-WBpr167o5XJZI1l7HWKImA"
              target="_blank"
              rel="noreferrer noopener"
              className="justify2-center flex items-center gap-2 text-0.5xs font-medium"
            >
              <Icon
                name={IconName.Slack}
                className="h-[1.25em] w-[1.25em] text-secondary"
              />
              Join Slack…
            </Link>
            <Link
              variant="secondary-button"
              href="https://github.com/restatedev/restate/issues/new"
              target="_blank"
              rel="noreferrer noopener"
              className="justify2-center flex items-center gap-2 text-0.5xs font-medium"
            >
              <Icon
                name={IconName.Github}
                className="h-[1.25em] w-[1.25em] text-secondary"
              />
              Open Github issue…
            </Link>
            {children}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Help() {
  const { isOpen } = usePopover();

  return (
    <PopoverTrigger>
      <Button
        variant="secondary"
        className="fixed bottom-2 left-2 z-50 hidden h-11 w-11 items-center justify-center rounded-full bg-surface/80 p-0 text-secondary shadow-lg shadow-default/5 backdrop-blur-xl backdrop-saturate-200 sm:right-4 sm:bottom-4 md:flex 3xl:bottom-6 3xl:left-[calc(50vw-min(50rem,calc(50vw-400px-2rem))-2rem)] pressed:scale-95 pressed:shadow-xs"
      >
        {isOpen ? (
          <Icon name={IconName.X} className="h-5 w-5" />
        ) : (
          <Icon name={IconName.Help} className="h-5 w-5" />
        )}
      </Button>
    </PopoverTrigger>
  );
}
