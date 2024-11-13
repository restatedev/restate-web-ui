import 'prismjs';
import { lazy } from 'react';

export const API = lazy(() =>
  import('@stoplight/elements').then((module) => ({ default: module.API }))
);

export const JsonSchemaViewer = lazy(() =>
  import('@stoplight/json-schema-viewer').then((module) => ({
    default: module.JsonSchemaViewer,
  }))
);
