import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OpenApiDocument } from './types.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', 'fixtures');

export function fixtureNames() {
  return readdirSync(FIXTURES_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

export function loadFixture(name: string): OpenApiDocument {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf8'));
}

export function withCloudSecurity(document: OpenApiDocument): OpenApiDocument {
  const components =
    typeof document.components === 'object' && document.components !== null
      ? (document.components as Record<string, unknown>)
      : {};
  return {
    ...document,
    components: {
      ...components,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API Key',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}
