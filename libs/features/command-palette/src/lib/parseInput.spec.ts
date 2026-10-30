import { normalizeEndpoint, parseInput } from './parseInput';

const INVOCATION_ID = 'inv_1aqk5EDJM4Rn3qzBHMn0bDDBvXvG3ynaKN';
const DEPLOYMENT_ID = 'dp_17veolWeFWvk8w3B9V3k7jr';
const VQUEUE_ID = 'vq_1aBcDeFgHiJkLmNoPqRs';

describe('parseInput', () => {
  it.each([
    [INVOCATION_ID, 'invocation'],
    [DEPLOYMENT_ID, 'deployment'],
    [VQUEUE_ID, 'vqueue'],
  ])('detects the pasted id %s', (id, kind) => {
    expect(parseInput(` ${id} `).id).toEqual({ kind, id });
  });

  it('only detects an id that is the whole input', () => {
    const line = `2026-10-21 WARN [${INVOCATION_ID}] deployment=${DEPLOYMENT_ID}`;
    expect(parseInput(line).id).toBeUndefined();
  });

  it('ignores id prefixes without an id body', () => {
    expect(parseInput('inv_1').id).toBeUndefined();
    expect(parseInput('vq_12').id).toBeUndefined();
  });

  it('detects an error code in any case', () => {
    expect(parseInput('rt0007').errorCode).toBe('RT0007');
  });

  it('only detects an error code that is the whole input', () => {
    expect(parseInput('failed with RT0007').errorCode).toBeUndefined();
  });

  it('detects SQL', () => {
    expect(parseInput('SELECT * FROM sys_invocation').sql).toBe(
      'SELECT * FROM sys_invocation',
    );
  });

  it.each([
    'http://localhost:9080',
    'https://my-service.example.com/restate',
    'localhost:9080',
    'tunnel://my-tunnel:9080',
    'connect://greeter-v1',
    'arn:aws:lambda:eu-central-1:123456789012:function:greeter:1',
    'service.internal:9080',
  ])('detects the endpoint %s', (endpoint) => {
    expect(parseInput(endpoint).endpoint).toBe(endpoint);
  });

  it.each(['*', 'scope/*', 'scope/*/*', 'scope/tenant/*'])(
    'detects the limit pattern %s',
    (pattern) => {
      expect(parseInput(pattern).limitPattern).toBe(pattern);
    },
  );

  it('needs a wildcard to treat a path as a limit pattern', () => {
    const parsed = parseInput('scope/tenant/key');
    expect(parsed.limitPattern).toBeUndefined();
    expect(parsed.servicePath).toEqual({
      service: 'scope',
      rest: 'tenant/key',
    });
  });

  it('splits Service/rest at the first slash', () => {
    expect(parseInput('Greeter/greet').servicePath).toEqual({
      service: 'Greeter',
      rest: 'greet',
    });
  });

  it('does not treat plain words as anything special', () => {
    expect(parseInput('held up')).toEqual({});
  });
});

describe('normalizeEndpoint', () => {
  it.each([
    ['localhost:9080/', 'http://localhost:9080'],
    ['my-service.example.com', 'https://my-service.example.com'],
    ['http://localhost:9080//', 'http://localhost:9080'],
    [
      'arn:aws:lambda:eu-central-1:123456789012:function:greeter:1',
      'arn:aws:lambda:eu-central-1:123456789012:function:greeter:1',
    ],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeEndpoint(input)).toBe(expected);
  });
});
