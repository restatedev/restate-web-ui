import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { setQueryClient } from '@restate/util/react-query';
import { client } from './client';
import './middleware';

describe('/version feature compatibility', () => {
  beforeEach(() => setQueryClient(new QueryClient()));
  afterEach(() => vi.unstubAllGlobals());

  async function getVersion(data: Record<string, unknown>) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(data)));
    return (await client.GET('/version', { baseUrl: 'https://restate.test' }))
      .data;
  }

  it.each(['1.8.0', '1.8.0-dev', '1.8.0-rc.1', '1.9.0'])(
    'restores removed flags for %s while preserving other response fields',
    async (version) => {
      const data = {
        version,
        ingress_endpoint: 'https://ingress.test',
        features: { kafka_scope: true },
      };

      expect(await getVersion(data)).toEqual({
        ...data,
        features: {
          vqueues: true,
          scoped_virtual_objects: true,
          protocol_v7: true,
          vqueues_migration_skip_completed: false,
          kafka_scope: true,
        },
      });
    },
  );

  it('preserves explicitly reported values over compatibility defaults', async () => {
    const data = {
      version: '1.8.0-dev',
      features: {
        vqueues: false,
        scoped_virtual_objects: false,
        protocol_v7: false,
        vqueues_migration_skip_completed: true,
      },
    };

    expect(await getVersion(data)).toEqual(data);
  });

  it.each(['1.7.0', '1.7.10', 'unknown', undefined])(
    'leaves flags unchanged for version %s',
    async (version) => {
      const data = {
        ...(version && { version }),
        features: { vqueues: true, vqueues_migration_skip_completed: true },
      };

      expect(await getVersion(data)).toEqual(data);
    },
  );

  it('supplies defaults when the features map is absent', async () => {
    expect(await getVersion({ version: '1.8.0' })).toEqual({
      version: '1.8.0',
      features: {
        vqueues: true,
        scoped_virtual_objects: true,
        protocol_v7: true,
        vqueues_migration_skip_completed: false,
      },
    });
  });
});

describe('/query origin headers', () => {
  beforeEach(() => setQueryClient(new QueryClient()));
  afterEach(() => vi.unstubAllGlobals());

  async function sendQuery(headers?: Record<string, string>) {
    const fetch = vi.fn().mockResolvedValue(Response.json({ rows: [] }));
    vi.stubGlobal('fetch', fetch);
    await client.POST('/query', {
      baseUrl: 'https://restate.test',
      body: { query: 'SELECT 1' },
      headers,
    });
    return (fetch.mock.calls[0]?.[0] as Request).headers;
  }

  it('marks queries as built-in by default', async () => {
    const headers = await sendQuery();
    expect(headers.get('X-Restate-Query-Client')).toBe('ui');
    expect(headers.get('X-Restate-Query-Origin')).toBe('built-in');
  });

  it('preserves an explicit origin', async () => {
    const headers = await sendQuery({ 'X-Restate-Query-Origin': 'user' });
    expect(headers.get('X-Restate-Query-Client')).toBe('ui');
    expect(headers.get('X-Restate-Query-Origin')).toBe('user');
  });

  it('does not tag non-query requests', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal('fetch', fetch);
    await client.GET('/version', { baseUrl: 'https://restate.test' });
    const headers = (fetch.mock.calls[0]?.[0] as Request).headers;
    expect(headers.has('X-Restate-Query-Client')).toBe(false);
    expect(headers.has('X-Restate-Query-Origin')).toBe(false);
  });
});
