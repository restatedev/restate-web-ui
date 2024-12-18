import JsonView from '@uiw/react-json-view';
import { useMemo } from 'react';

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
    return <JsonView value={object} className={className} />;
  }

  return <div className={className}>{value}</div>;
}
