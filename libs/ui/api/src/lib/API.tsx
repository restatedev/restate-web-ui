// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useId, Component, Suspense, lazy } from 'react';
import type { ErrorInfo, PropsWithChildren } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';

if (typeof window !== 'undefined') {
  import('prism-react-renderer');
  import('@stoplight/json-schema-viewer');
}

const JsonSchemaViewerInner = lazy(() => {
  return import('prism-react-renderer').then((module) => {
    (window as any).Prism = module.Prism;

    return import('@stoplight/json-schema-viewer').then((module) => ({
      default: module.JsonSchemaViewer,
    }));
  });
});

export const API = ({
  apiDescriptionDocument,
  layout = 'responsive',
}: {
  apiDescriptionDocument?: string;
  layout?: 'sidebar' | 'responsive' | 'stacked';
}) => {
  const id = useId();

  return (
    <elements-api
      id={id}
      apiDescriptionDocument={apiDescriptionDocument}
      router="hash"
      layout={layout}
      tryItCredentialsPolicy="include"
      className="spotlight"
    />
  );
};

export const JsonSchemaViewer = ({
  schema,
  className,
}: {
  schema?: any;
  className?: string;
}) => {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 py-2">
            <Spinner className="w-4 h-4" />
            Loading…
          </div>
        }
      >
        <JsonSchemaViewerInner
          className={'spotlight ' + className}
          schema={schema as any}
          disableCrumbs
          renderRootTreeLines
        />
      </Suspense>
    </ErrorBoundary>
  );
};

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
          to display the content type
        </div>
      );
    }

    return this.props.children;
  }
}
