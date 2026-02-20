#!/usr/bin/env node

import query from './lib/query.json' with { type: "json" };
import spec from './lib/spec.json' with { type: "json" };
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use fileURLToPath and import.meta.url to get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const output = {
  ...spec,
  ...query,
  paths: {
    ...spec.paths,
    ...query.paths,
  },
  components: {
    schemas: {
      ...spec.components.schemas,
      ...query.components.schemas,
    },
    responses: {
      ...spec.components?.responses,
      ...query.components?.responses,
    },
  },
};
writeFileSync(
  path.join(__dirname, './lib/output.json'),
  JSON.stringify(output, null, 2),
  'utf8'
);
