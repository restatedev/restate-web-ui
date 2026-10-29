import { describe, expect, it } from 'vitest';
import type { Deployment } from '@restate/data-access-admin-api-spec';
import { IconName } from '@restate/ui-icons';
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
  const deployment = (uri: string, metadata?: Record<string, string>) =>
    ({
      type: 'http',
      id: 'dp_1',
      uri,
      metadata,
    }) as unknown as Deployment;

  it('shows an image run on Modal by its image, not the relay address', () => {
    expect(
      resolveDeploymentEndpoint(
        deployment('http://relay:9080/modal/sandbox/http/m1/9080/', {
          'modal.image': 'ghcr.io/acme/app:v1',
        }),
        undefined,
      ),
    ).toMatchObject({
      label: 'Modal · ghcr.io/acme/app:v1',
      icon: IconName.Modal,
    });
  });

  it('shows an auto-registered tunnel by its name and version', () => {
    expect(
      resolveDeploymentEndpoint(
        deployment('http://relay:9080/e1/c1.v1/http/sdk/9080/', {
          'relay.env': 'e1',
          'relay.tunnel': 'c1',
          'relay.version': 'v1',
        }),
        undefined,
      ),
    ).toMatchObject({ label: 'c1 @ v1', icon: IconName.Tunnel });
    expect(
      resolveDeploymentEndpoint(deployment('http://svc:9080/'), undefined),
    ).toMatchObject({ label: 'svc:9080', icon: IconName.Http });
  });
});
