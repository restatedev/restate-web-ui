import { useRestateContext } from '@restate/features/restate-context';

export function Version() {
  const { version } = useRestateContext();

  if (!version) {
    return null;
  }

  return (
    <span className="mt-0.5 items-center rounded-xl bg-white/50 px-2 font-mono text-2xs leading-4 text-gray-500 ring-1 ring-gray-500/20 ring-inset">
      v{version}
    </span>
  );
}
