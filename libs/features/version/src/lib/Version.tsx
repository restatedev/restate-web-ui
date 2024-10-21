import { useRestateContext } from '@restate/features/restate-context';

export function Version() {
  const { version } = useRestateContext();

  if (!version) {
    return null;
  }

  return (
    <span className="text-2xs font-mono items-center rounded-xl px-2 leading-4 bg-white/50 ring-1 ring-inset ring-gray-500/20 text-gray-500 mt-0.5">
      v{version}
    </span>
  );
}
