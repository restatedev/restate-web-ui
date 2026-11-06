import type { PlaygroundRequest } from './request.js';
import {
  toCurl,
  toFetch,
  toGoClient,
  toJavaClient,
  toPython,
  toPythonClient,
  toTypeScriptClient,
  type RestateClientSnippetInput,
} from './snippets.js';

const jsonRequest: PlaygroundRequest = {
  method: 'POST',
  url: 'http://localhost:8080/restate/send/Cart/user%2F42/add?delay=10s',
  headers: [
    ['Accept', 'application/json'],
    ['idempotency-key', "it's-1"],
    ['Content-Type', 'application/json'],
    ['Authorization', 'Bearer <API_KEY>'],
  ],
  body: { kind: 'text', text: '{"sku":"a","qty":2,"gift":null,"ok":true}' },
};

const textRequest: PlaygroundRequest = {
  method: 'POST',
  url: 'http://localhost:8080/restate/call/Orders/importCsv',
  headers: [
    ['Accept', 'text/plain'],
    ['Content-Type', 'text/plain'],
  ],
  body: { kind: 'text', text: "a,b\n1,'2'" },
};

describe('toCurl', () => {
  it('quotes values for the shell', () => {
    expect(toCurl(jsonRequest)).toMatchSnapshot();
    expect(toCurl(textRequest)).toMatchSnapshot();
  });

  it('sends files with --data-binary', () => {
    expect(
      toCurl({
        method: 'POST',
        url: 'http://localhost:8080/restate/call/Orders/upload',
        headers: [['Content-Type', 'application/octet-stream']],
        body: { kind: 'file', file: new Blob([]), name: 'data.bin' },
      }),
    ).toContain("--data-binary '@data.bin'");
  });
});

describe('toFetch', () => {
  it('stringifies JSON bodies and reads JSON responses', () => {
    expect(toFetch(jsonRequest)).toMatchSnapshot();
    expect(toFetch(textRequest)).toMatchSnapshot();
  });
});

describe('toPython', () => {
  it('uses Python literals for JSON bodies', () => {
    expect(toPython(jsonRequest)).toMatchSnapshot();
    expect(toPython(textRequest)).toMatchSnapshot();
  });
});

const CLIENTS = {
  typescript: toTypeScriptClient,
  java: toJavaClient,
  go: toGoClient,
  python: toPythonClient,
};

const objectSend: RestateClientSnippetInput = {
  ingressUrl: 'http://localhost:8080',
  serviceName: 'Cart',
  serviceType: 'VirtualObject',
  handlerName: 'add',
  handlerKind: 'Exclusive',
  mode: 'send',
  key: 'user/42',
  idempotencyKey: 'abc',
  delayMs: 10000,
  body: '{"sku":"a","note":"$5 \\\\ off","qty":2,"gift":null}',
  bodyContentType: 'application/json',
  authorization: 'Bearer <API_KEY>',
};

const workflowCall: RestateClientSnippetInput = {
  ingressUrl: 'http://localhost:8080',
  serviceName: 'Signup',
  serviceType: 'Workflow',
  handlerName: 'run',
  handlerKind: 'Workflow',
  mode: 'call',
  key: 'jane',
  body: '{"email":"jane@example.com"}',
  bodyContentType: 'application/json',
};

const scopedServiceCall: RestateClientSnippetInput = {
  ingressUrl: 'http://localhost:8080',
  serviceName: 'acme.Orders',
  serviceType: 'Service',
  handlerName: 'ping',
  mode: 'scopedCall',
  scope: 'tenant-1',
  limitKey: 'team-a/user-1',
};

describe.each(Object.entries(CLIENTS))('%s SDK client', (_, toClient) => {
  it('writes a virtual object send with a delay and an idempotency key', () => {
    expect(toClient(objectSend)).toMatchSnapshot();
  });

  it('calls a workflow and a scoped service without input', () => {
    expect(toClient(workflowCall)).toMatchSnapshot();
    expect(toClient(scopedServiceCall)).toMatchSnapshot();
  });

  it('has no snippet for attach, output or non-JSON bodies', () => {
    expect(toClient({ ...objectSend, mode: 'attach' })).toBeUndefined();
    expect(
      toClient({ ...objectSend, bodyContentType: 'text/plain' }),
    ).toBeUndefined();
  });
});
