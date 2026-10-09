import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import { tv } from '@restate/util/styles';

const styles = tv({
  slots: {
    link: 'group/page-link hidden h-6.5 shrink-0 items-center gap-0.5 rounded-lg px-2 text-xs font-medium whitespace-nowrap text-zinc-500 no-underline transition-colors hover:bg-black/[0.035] hover:text-zinc-700 focus-visible:bg-black/[0.035] focus-visible:text-zinc-700 md:inline-flex pressed:bg-black/[0.07]',
    icon: 'h-3.5 w-3.5 text-zinc-400 transition-colors group-hover/page-link:text-zinc-500',
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
