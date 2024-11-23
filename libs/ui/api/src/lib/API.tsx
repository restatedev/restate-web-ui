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
  className,
}: {
  apiDescriptionDocument?: string;
  className?: string;
}) => {
  const id = useId();

  return (
    <elements-api
      className={className}
      id={id}
      apiDescriptionDocument={apiDescriptionDocument}
      router="hash"
      layout="responsive"
      hideExport="true"
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
