import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import {
  Component,
  ErrorInfo,
  lazy,
  PropsWithChildren,
  RefObject,
  Suspense,
} from 'react';
import type { editor } from 'monaco-editor';

const MonacoEditor = lazy(() =>
  import('./.client/MonacoEditor').then((m) => ({ default: m.MonacoEditor })),
);

export function Editor({
  value,
  className,
  editorRef,
  readonly,
  onInput,
}: {
  value?: string;
  className?: string;
  editorRef: RefObject<editor.IStandaloneCodeEditor | null>;
  readonly?: boolean;
  onInput?: (value: string) => void;
}) {
  if (typeof value === 'undefined') {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className={className}>
        <Suspense
          fallback={
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Spinner className="h-4 w-4" />
              Loading…
            </div>
          }
        >
          <MonacoEditor
            value={value}
            editorRef={editorRef}
            readonly={readonly}
            onInput={onInput}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends Component<
  PropsWithChildren,
  {
    hasError: boolean;
  }
> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): {
    hasError: boolean;
  } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary: ', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-1 flex w-full max-w-full min-w-0 flex-wrap items-center gap-2 truncate rounded-lg px-2 py-1 text-0.5xs text-red-500">
          <Icon name={IconName.TriangleAlert} className="h-3.5 w-3.5" /> Failed
          to display value
        </div>
      );
    }

    return this.props.children;
  }
}
