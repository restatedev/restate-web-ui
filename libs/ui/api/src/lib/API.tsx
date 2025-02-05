// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { lazy, useId } from 'react';

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
    <JsonSchemaViewerInner
      className={className}
      schema={schema as any}
      disableCrumbs
      renderRootTreeLines
    />
  );
};
