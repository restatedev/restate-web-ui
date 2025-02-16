import { Icon, IconName } from '@restate/ui/icons';
import JsonView from '@uiw/react-json-view';
import { Component, ErrorInfo, PropsWithChildren, useMemo } from 'react';

export function Value({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  const object = useMemo(() => {
    if (value) {
      try {
        return JSON.parse(value);
        // eslint-disable-next-line no-empty
      } catch (_) {}
      return undefined;
    }
  }, [value]);

  if (typeof value === 'undefined') {
    return null;
  }

  if (object && typeof object === 'object') {
    return (
      <ErrorBoundary>
        <JsonView
          value={object}
          className={className}
          displayDataTypes={false}
        />
      </ErrorBoundary>
    );
  }

  return <div className={className}>{value}</div>;
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
