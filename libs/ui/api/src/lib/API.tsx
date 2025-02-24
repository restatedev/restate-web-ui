// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useId, Component } from 'react';
import type { ErrorInfo, PropsWithChildren } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { JsonSchemaViewer as JsonSchemaViewerInner } from '@stoplight/json-schema-viewer';

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
      <JsonSchemaViewerInner
        className={className}
        schema={schema as any}
        disableCrumbs
        renderRootTreeLines
      />
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
