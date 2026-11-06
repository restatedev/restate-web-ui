import { lazy, Suspense } from 'react';
import { editorColors } from '@restate/ui-editor';
import { Spinner } from '@restate/ui-loading';
import { useHydrated } from '@restate/util-remix';
import { tv } from '@restate/util-styles';

const MonacoBodyEditor = lazy(() =>
  import('./.client/MonacoBodyEditor').then((module) => ({
    default: module.MonacoBodyEditor,
  })),
);

const styles = tv({
  base: 'overflow-hidden rounded-lg border border-inset bg-inset shadow-[inset_0_1px_2px_0px_var(--box-shadow-color-inset)] focus-within:outline-2 focus-within:outline-focus',
});

export function BodyEditor({
  modelUri,
  value,
  language,
  schemas,
  onChange,
  ariaLabel,
  className,
}: {
  modelUri: string;
  value: string;
  language: 'json' | 'plaintext';
  schemas?: { uri: string; schema: unknown }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  const loading = (
    <div className="flex min-h-24 items-center gap-1.5 px-3 text-sm text-muted">
      <Spinner className="h-4 w-4" />
      Loading editor…
    </div>
  );

  return (
    <div className={styles({ className: [editorColors(), className] })}>
      {hydrated ? (
        <Suspense fallback={loading}>
          <MonacoBodyEditor
            modelUri={modelUri}
            value={value}
            language={language}
            schemas={schemas}
            onChange={onChange}
            ariaLabel={ariaLabel}
          />
        </Suspense>
      ) : (
        loading
      )}
    </div>
  );
}
