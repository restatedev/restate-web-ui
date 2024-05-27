import { Link } from '@restate/ui/link';

export function LearnMore({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline"
      variant="secondary"
    >
      Learn more…
    </Link>
  );
}
