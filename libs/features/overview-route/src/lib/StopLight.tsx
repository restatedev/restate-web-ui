import { Prism } from 'prism-react-renderer';
import { lazy } from 'react';

if (typeof window !== 'undefined') {
  (window as any).Prism = Prism;
}

export const API = lazy(() =>
  import('@stoplight/elements').then((module) => ({ default: module.API }))
);

export const JsonSchemaViewer = lazy(() =>
  import('@stoplight/json-schema-viewer').then((module) => ({
    default: module.JsonSchemaViewer,
  }))
);
