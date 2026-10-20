import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { tv } from '@restate/util-styles';

const styles = tv({
  slots: {
    link: 'group/page-link hidden h-6.5 shrink-0 items-center gap-0.5 rounded-lg px-2 text-xs font-medium whitespace-nowrap text-muted no-underline transition-colors hover:bg-tint-subtle hover:text-secondary focus-visible:bg-tint-subtle focus-visible:text-secondary md:inline-flex pressed:bg-tint',
    icon: 'h-3.5 w-3.5 text-subtle transition-colors group-hover/page-link:text-muted',
  },
});

export function ViewInInvocationsLink({ href }: { href: string }) {
  const s = styles();
  return (
    <Link
      href={href}
      variant="secondary"
      preserveQueryParams={false}
      className={s.link()}
    >
      View in Invocations
      <Icon name={IconName.ArrowUpRight} className={s.icon()} />
    </Link>
  );
}
