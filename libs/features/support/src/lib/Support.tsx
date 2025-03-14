import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopover,
} from '@restate/ui/popover';
import { Header } from 'react-aria-components';

export function Support() {
  return (
    <Popover>
      <Help />
      <PopoverContent>
        <div className="p-1 pt-0">
          <Header className="text-sm font-semibold text-gray-500 px-4 py-1 pt-2 truncate">
            Do you need help?
          </Header>
          <div className="flex flex-col gap-1">
            <Link
              variant="secondary-button"
              href="https://docs.restate.dev/"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 text-code font-medium"
            >
              <Icon
                name={IconName.Docs}
                className="w-[1.25em] h-[1.25em] text-gray-700"
              />
              Read documentation…
            </Link>
            <Link
              variant="secondary-button"
              href="https://discord.gg/skW3AZ6uGd"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 justify2-center text-code font-medium"
            >
              <Icon
                name={IconName.Discord}
                className="w-[1.25em] h-[1.25em] text-gray-700"
              />
              Join Discord…
            </Link>
            <Link
              variant="secondary-button"
              href="https://join.slack.com/t/restatecommunity/shared_invite/zt-2v9gl005c-WBpr167o5XJZI1l7HWKImA"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 justify2-center text-code font-medium"
            >
              <Icon
                name={IconName.Slack}
                className="w-[1.25em] h-[1.25em] text-gray-700"
              />
              Join Slack…
            </Link>
            <Link
              variant="secondary-button"
              href="https://github.com/restatedev/restate/issues/new"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 justify2-center text-code font-medium"
            >
              <Icon
                name={IconName.Github}
                className="w-[1.25em] h-[1.25em] text-gray-700"
              />
              Open Github issue…
            </Link>
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
        className="fixed p-0 md:flex hidden items-center justify-center bottom-2 left-2 3xl:bottom-6 3xl:left-[calc(50vw-min(50rem,calc(50vw-400px-2rem))-2rem)] sm:bottom-4 sm:right-4 rounded-full w-11 h-11 bg-white/80 backdrop-blur-xl backdrop-saturate-200 text-gray-700 shadow-lg shadow-zinc-800/5 z-50  pressed:shadow-sm pressed:scale-95"
      >
        {isOpen ? (
          <Icon name={IconName.X} className="w-5 h-5" />
        ) : (
          <Icon name={IconName.Help} className="w-5 h-5" />
        )}
      </Button>
    </PopoverTrigger>
  );
}
