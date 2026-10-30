import { describe, expect, it } from 'vitest';
import {
  formatDeploymentLabel,
  resolveDeploymentEndpoint,
} from './deploymentLabel';

describe('formatDeploymentLabel', () => {
  it('drops the scheme and trailing slash of an HTTP endpoint', () => {
    expect(formatDeploymentLabel('http://127.0.0.1:9102/')).toBe(
      '127.0.0.1:9102',
    );
  });

  it('keeps the path of an HTTP endpoint', () => {
    expect(formatDeploymentLabel('https://svc.example.com/restate/v1')).toBe(
      'svc.example.com/restate/v1',
    );
  });

  it('shows the function name and version of a Lambda ARN', () => {
    expect(
      formatDeploymentLabel(
        'arn:aws:lambda:eu-central-1:123456789012:function:greeter:7',
      ),
    ).toBe('greeter:7');
  });

  it('keeps an ARN it cannot shorten', () => {
    expect(formatDeploymentLabel('arn:aws:lambda:eu-central-1:123')).toBe(
      'arn:aws:lambda:eu-central-1:123',
    );
  });
});

describe('resolveDeploymentEndpoint', () => {
  const tunnel = {
    isEnabled: true,
    toHttp: () => undefined,
    fromHttp: (url?: string) =>
      url?.includes('/in-process/')
        ? {
            name: 'quiet-amber-otter',
            tunnelUrl: '',
            mode: 'in-process' as const,
          }
        : url?.includes('/http/')
          ? {
              name: 'my-tunnel',
              tunnelUrl: '',
              remoteUrl: 'localhost:9080',
              mode: 'standalone' as const,
            }
          : undefined,
  };
  const httpDeployment = (uri: string) =>
    ({ id: 'dp_1', uri, services: [] }) as never;

  it('labels an in-process deployment as a connected service', () => {
    const result = resolveDeploymentEndpoint(
      httpDeployment(
        'https://tunnel.example:9080/env/quiet-amber-otter/http/in-process/9080/',
      ),
      tunnel,
    );
    expect(result.isTunnel).toBe(true);
    expect(result.tunnelName).toBe('quiet-amber-otter');
    expect(result.tunnelKind).toBe('Connected service');
    expect(result.label).toBe('quiet-amber-otter');
  });

  it('labels a standalone deployment as a tunnel client with its destination', () => {
    const result = resolveDeploymentEndpoint(
      httpDeployment(
        'https://tunnel.example:9080/env/my-tunnel/http/localhost/9080',
      ),
      tunnel,
    );
    expect(result.tunnelKind).toBe('Tunnel client');
    expect(result.endpoint).toBe('localhost:9080');
    expect(result.label).toBe('localhost:9080');
  });

  it('leaves plain HTTP deployments alone', () => {
    const result = resolveDeploymentEndpoint(
      httpDeployment('http://localhost:9080'),
      tunnel,
    );
    expect(result.isTunnel).toBe(false);
    expect(result.tunnelKind).toBeUndefined();
  });
});
