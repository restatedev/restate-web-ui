import { useRestateContext } from '@restate/features-restate-context';

export function Version() {
  const { version } = useRestateContext();

  if (!version) {
    return null;
  }

  return (
    <span className="mt-0.5 items-center rounded-xl bg-surface/50 px-2 font-mono text-2xs leading-4 text-muted ring-1 ring-tint ring-inset">
      v{version}
    </span>
  );
}
