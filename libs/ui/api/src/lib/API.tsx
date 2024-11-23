import { useEffect, useId } from 'react';
import { JsonSchemaViewer as JsonSchemaViewerInner } from '@stoplight/json-schema-viewer';

export const API = ({
  apiDescriptionDocument,
  className,
}: {
  apiDescriptionDocument?: string;
  className?: string;
}) => {
  const id = useId();

  useEffect(() => {
    const docs = document.getElementById(id);
    if (apiDescriptionDocument && docs) {
      (docs as any).apiDescriptionDocument = apiDescriptionDocument;
    }
  }, [apiDescriptionDocument, id]);

  return (
    <elements-api
      className={className}
      id={id}
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
