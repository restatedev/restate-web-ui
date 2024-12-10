// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { lazy, useId } from 'react';
import { Prism } from 'prism-react-renderer';

if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
  import('@stoplight/json-schema-viewer');
}

const JsonSchemaViewerInner = lazy(() =>
  import('@stoplight/json-schema-viewer').then((module) => ({
    default: module.JsonSchemaViewer,
  }))
);

export const API = ({
  apiDescriptionDocument,
}: {
  apiDescriptionDocument?: string;
}) => {
  const id = useId();

  return (
    <elements-api
      id={id}
      apiDescriptionDocument={apiDescriptionDocument}
      router="hash"
      layout="responsive"
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
