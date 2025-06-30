import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import {
  Component,
  ErrorInfo,
  lazy,
  PropsWithChildren,
  Suspense,
  useRef,
} from 'react';
import type { editor } from 'monaco-editor';

const ValueMonaco = lazy(() =>
  import('./.client/ValueMonaco').then((m) => ({ default: m.ValueMonaco }))
);

export function Value({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  if (typeof value === 'undefined') {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className={className}>
        <Suspense
          fallback={
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Spinner className="w-4 h-4" />
              Loading…
            </div>
          }
        >
          <ValueMonaco value={value} editorRef={editorRef} />
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
        <div className="truncate max-w-full flex items-center text-red-500 gap-2 flex-wrap w-full min-w-0 my-1  px-2  py-1 text-code rounded-lg ">
          <Icon name={IconName.TriangleAlert} className="w-3.5 h-3.5" /> Failed
          to display value
        </div>
      );
    }

    return this.props.children;
  }
}
