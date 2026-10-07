import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { HoverTooltip } from '@restate/ui/tooltip';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    link: 'relative shrink-0 border-none bg-gray-50 px-1 py-1 align-middle shadow-none',
    icon: 'ml-px h-3 w-3 fill-blue-300 text-blue-700/0',
  },
  variants: {
    isHighlighted: {
      true: {
        link: 'animate-pulseButton bg-blue-50',
        icon: 'fill-blue-500',
      },
    },
  },
});

export function PlaygroundIconLink({
  href,
  'aria-label': ariaLabel,
  isHighlighted = false,
  preserveQueryParams,
  className,
}: {
  href: string;
  'aria-label': string;
  isHighlighted?: boolean;
  preserveQueryParams?: boolean;
  className?: string;
}) {
  const s = styles({ isHighlighted });
  return (
    <HoverTooltip content="Playground" disabled={isHighlighted}>
      <Link
        aria-label={ariaLabel}
        href={href}
        variant="secondary-button"
        preserveQueryParams={preserveQueryParams}
        className={s.link({ className })}
        autoFocus={isHighlighted}
      >
        <Icon name={IconName.Play} className={s.icon()} />
      </Link>
    </HoverTooltip>
  );
}
