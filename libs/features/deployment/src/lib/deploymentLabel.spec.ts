import { describe, expect, it } from 'vitest';
import { formatDeploymentLabel } from './deploymentLabel';

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
