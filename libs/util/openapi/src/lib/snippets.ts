import type { PlaygroundRequest } from './request.js';
import type { HandlerMode } from './types.js';

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function isJsonContentType(contentType: string | undefined) {
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  return mediaType === 'application/json' || mediaType.endsWith('+json');
}

function header(request: PlaygroundRequest, name: string) {
  return request.headers.find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
}

function indent(text: string, spaces: number) {
  const padding = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${padding}${line}`))
    .join('\n');
}

function prettyJsonBody(request: PlaygroundRequest) {
  if (request.body?.kind !== 'text') {
    return undefined;
  }
  if (!isJsonContentType(header(request, 'Content-Type'))) {
    return undefined;
  }
  const parsed = parseJson(request.body.text);
  return parsed.ok ? parsed : undefined;
}

export function toCurl(request: PlaygroundRequest) {
  const lines = [
    `curl --request ${request.method}`,
    `--url ${shellQuote(request.url)}`,
    ...request.headers.map(
      ([name, value]) => `--header ${shellQuote(`${name}: ${value}`)}`,
    ),
  ];
  if (request.body?.kind === 'file') {
    lines.push(
      `--data-binary ${shellQuote(`@${request.body.name ?? 'file'}`)}`,
    );
  } else if (request.body?.kind === 'text') {
    const json = prettyJsonBody(request);
    lines.push(
      `--data ${shellQuote(json ? JSON.stringify(json.value, null, 2) : request.body.text)}`,
    );
  }
  return lines.join(' \\\n  ');
}

function jsString(value: string) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}

export function toFetch(request: PlaygroundRequest) {
  const lines = [`const response = await fetch(${jsString(request.url)}, {`];
  lines.push(`  method: ${jsString(request.method)},`);
  if (request.headers.length > 0) {
    lines.push('  headers: {');
    for (const [name, value] of request.headers) {
      lines.push(`    ${jsString(name)}: ${jsString(value)},`);
    }
    lines.push('  },');
  }
  if (request.body?.kind === 'file') {
    lines.push('  body: file,');
  } else if (request.body?.kind === 'text') {
    const json = prettyJsonBody(request);
    lines.push(
      json
        ? `  body: JSON.stringify(${indent(JSON.stringify(json.value, null, 2), 2)}),`
        : `  body: ${jsString(request.body.text)},`,
    );
  }
  lines.push('});');
  const accept = header(request, 'Accept');
  lines.push(
    isJsonContentType(accept)
      ? 'const data = await response.json();'
      : 'const data = await response.text();',
  );
  return lines.join('\n');
}

function pythonLiteral(value: unknown, level = 0): string {
  const padding = '    '.repeat(level + 1);
  const closing = '    '.repeat(level);
  if (value === null || value === undefined) {
    return 'None';
  }
  if (value === true) {
    return 'True';
  }
  if (value === false) {
    return 'False';
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `[\n${value
      .map((item) => `${padding}${pythonLiteral(item, level + 1)},`)
      .join('\n')}\n${closing}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return '{}';
  }
  return `{\n${entries
    .map(
      ([key, item]) =>
        `${padding}${JSON.stringify(key)}: ${pythonLiteral(item, level + 1)},`,
    )
    .join('\n')}\n${closing}}`;
}

export function toPython(request: PlaygroundRequest) {
  const lines = [
    'import httpx',
    '',
    `response = httpx.request(`,
    `    ${JSON.stringify(request.method)},`,
    `    ${JSON.stringify(request.url)},`,
  ];
  if (request.headers.length > 0) {
    lines.push('    headers={');
    for (const [name, value] of request.headers) {
      lines.push(`        ${JSON.stringify(name)}: ${JSON.stringify(value)},`);
    }
    lines.push('    },');
  }
  if (request.body?.kind === 'file') {
    lines.push(
      `    content=open(${JSON.stringify(request.body.name ?? 'file')}, "rb").read(),`,
    );
  } else if (request.body?.kind === 'text') {
    const json = prettyJsonBody(request);
    lines.push(
      json
        ? `    json=${pythonLiteral(json.value, 1)},`
        : `    content=${JSON.stringify(request.body.text)},`,
    );
  }
  lines.push(')');
  const accept = header(request, 'Accept');
  lines.push(
    isJsonContentType(accept)
      ? 'print(response.json())'
      : 'print(response.text)',
  );
  return lines.join('\n');
}

export type RestateServiceType = 'Service' | 'VirtualObject' | 'Workflow';
export type RestateHandlerKind = 'Shared' | 'Exclusive' | 'Workflow';

export interface RestateClientSnippetInput {
  ingressUrl: string;
  serviceName: string;
  serviceType: RestateServiceType;
  handlerName: string;
  handlerKind?: RestateHandlerKind;
  mode: HandlerMode;
  key?: string;
  scope?: string;
  idempotencyKey?: string;
  limitKey?: string;
  delayMs?: number;
  body?: string;
  bodyContentType?: string;
  authorization?: string;
}

type ClientTarget = 'service' | 'object' | 'workflow';

interface ClientCall {
  ingressUrl: string;
  token?: string;
  service: string;
  handler: string;
  target: ClientTarget;
  key: string;
  isSend: boolean;
  scope?: string;
  idempotencyKey?: string;
  limitKey?: string;
  delayMs?: number;
  input?: { ok: true; value: unknown } | { ok: false; text: string };
}

function clientCall(input: RestateClientSnippetInput): ClientCall | undefined {
  if (!['call', 'send', 'scopedCall', 'scopedSend'].includes(input.mode)) {
    return undefined;
  }
  const hasInput = input.body !== undefined && input.body.trim().length > 0;
  if (hasInput && !isJsonContentType(input.bodyContentType)) {
    return undefined;
  }
  const isSend = input.mode === 'send' || input.mode === 'scopedSend';
  const isScoped = input.mode === 'scopedCall' || input.mode === 'scopedSend';
  const parsed = hasInput ? parseJson(input.body ?? '') : undefined;
  return {
    ingressUrl: input.ingressUrl,
    token: input.authorization?.replace(/^Bearer\s+/i, ''),
    service: input.serviceName,
    handler: input.handlerName,
    target:
      input.serviceType === 'VirtualObject'
        ? 'object'
        : input.serviceType === 'Workflow'
          ? 'workflow'
          : 'service',
    key: input.key ?? '',
    isSend,
    scope: isScoped ? (input.scope ?? '') : undefined,
    idempotencyKey: input.idempotencyKey || undefined,
    limitKey: isScoped ? input.limitKey || undefined : undefined,
    delayMs: isSend ? input.delayMs : undefined,
    input: parsed
      ? parsed.ok
        ? parsed
        : { ok: false, text: input.body ?? '' }
      : undefined,
  };
}

function jsonText(input: NonNullable<ClientCall['input']>) {
  return input.ok ? JSON.stringify(input.value, null, 2) : input.text;
}

function quoted(value: string) {
  return JSON.stringify(value);
}

function jsLiteral(value: unknown) {
  return JSON.stringify(value, null, 2).replace(
    /"([A-Za-z_$][A-Za-z0-9_$]*)":/g,
    '$1:',
  );
}

export function toTypeScriptClient(input: RestateClientSnippetInput) {
  const call = clientCall(input);
  if (!call) {
    return undefined;
  }
  const fields = [
    `service: ${jsString(call.service)}`,
    `handler: ${jsString(call.handler)}`,
  ];
  if (call.target !== 'service') {
    fields.push(`key: ${jsString(call.key)}`);
  }
  fields.push(
    `parameter: ${
      call.input
        ? indent(
            call.input.ok ? jsLiteral(call.input.value) : call.input.text,
            2,
          )
        : 'undefined'
    }`,
  );
  if (call.scope !== undefined) {
    fields.push(`scope: ${jsString(call.scope)}`);
  }
  const options: string[] = [];
  if (call.idempotencyKey) {
    options.push(`idempotencyKey: ${jsString(call.idempotencyKey)}`);
  }
  if (call.limitKey) {
    options.push(`limitKey: ${jsString(call.limitKey)}`);
  }
  if (call.delayMs !== undefined) {
    options.push(`delay: ${call.delayMs}`);
  }
  if (options.length > 0) {
    fields.push(
      `opts: clients.rpc.${call.isSend ? 'sendOpts' : 'opts'}({ ${options.join(', ')} })`,
    );
  }
  const connect = call.token
    ? `{\n  url: ${jsString(call.ingressUrl)},\n  headers: { Authorization: ${jsString(`Bearer ${call.token}`)} },\n}`
    : `{ url: ${jsString(call.ingressUrl)} }`;
  return [
    "import * as clients from '@restatedev/restate-sdk-clients';",
    '',
    `const rs = clients.connect(${connect});`,
    call.isSend
      ? 'const handle = await rs.send<unknown>({'
      : 'const result = await rs.call<unknown, unknown>({',
    ...fields.map((field) => `  ${field},`),
    '});',
    call.isSend ? 'console.log(handle.invocationId);' : 'console.log(result);',
  ].join('\n');
}

function javaTarget(call: ClientCall) {
  const scope = call.scope !== undefined ? `${quoted(call.scope)}, ` : '';
  switch (call.target) {
    case 'object':
      return `Target.virtualObject(${scope}${quoted(call.service)}, ${quoted(call.key)}, ${quoted(call.handler)})`;
    case 'workflow':
      return `Target.workflow(${scope}${quoted(call.service)}, ${quoted(call.key)}, ${quoted(call.handler)})`;
    default:
      return `Target.service(${scope}${quoted(call.service)}, ${quoted(call.handler)})`;
  }
}

export function toJavaClient(input: RestateClientSnippetInput) {
  const call = clientCall(input);
  if (!call) {
    return undefined;
  }
  const body = call.input
    ? `"""\n${indent(jsonText(call.input).replace(/\\/g, '\\\\'), 12).replace(/^/, '            ')}\n            """.getBytes(StandardCharsets.UTF_8)`
    : 'new byte[0]';
  const request = [
    `Request.of(${javaTarget(call)}, json, json, body)`,
    ...(call.idempotencyKey
      ? [`.idempotencyKey(${quoted(call.idempotencyKey)})`]
      : []),
    ...(call.limitKey ? [`.limitKey(${quoted(call.limitKey)})`] : []),
  ].join('\n                ');
  const connect = call.token
    ? `Client.connect(\n            ${quoted(call.ingressUrl)},\n            RequestOptions.builder().header("Authorization", ${quoted(`Bearer ${call.token}`)}).build());`
    : `Client.connect(${quoted(call.ingressUrl)});`;
  const lines = [
    '// implementation("dev.restate:client:2.11.0")',
    'import dev.restate.client.Client;',
    ...(call.token ? ['import dev.restate.client.RequestOptions;'] : []),
    'import dev.restate.common.Request;',
    'import dev.restate.common.Target;',
    'import dev.restate.serde.Serde;',
    'import java.nio.charset.StandardCharsets;',
    ...(call.delayMs !== undefined ? ['import java.time.Duration;'] : []),
    '',
    'public class Main {',
    '    public static void main(String[] args) {',
    `        var client = ${connect}`,
    '        var json = Serde.withContentType("application/json", Serde.RAW);',
    `        var body = ${body};`,
  ];
  if (call.isSend) {
    const delay =
      call.delayMs !== undefined
        ? `,\n            Duration.ofMillis(${call.delayMs})`
        : '';
    lines.push(
      `        var handle = client.send(\n            ${request}${delay});`,
      '        System.out.println(handle.invocationId());',
    );
  } else {
    lines.push(
      `        var result = client.call(\n            ${request}).response();`,
      '        System.out.println(new String(result, StandardCharsets.UTF_8));',
    );
  }
  lines.push('    }', '}');
  return lines.join('\n');
}

function goDuration(ms: number) {
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}*time.Hour`;
  if (ms % 60_000 === 0) return `${ms / 60_000}*time.Minute`;
  if (ms % 1000 === 0) return `${ms / 1000}*time.Second`;
  return `${ms}*time.Millisecond`;
}

export function toGoClient(input: RestateClientSnippetInput) {
  const call = clientCall(input);
  if (!call) {
    return undefined;
  }
  const inputType = call.input ? 'json.RawMessage' : 'restate.Void';
  const text = call.input ? jsonText(call.input) : '';
  const inputValue = !call.input
    ? 'restate.Void{}'
    : text.includes('`')
      ? `json.RawMessage(${quoted(text)})`
      : `json.RawMessage(\`${indent(text, 1).replace(/\n /g, '\n\t')}\`)`;
  const constructor = call.isSend
    ? {
        service: 'ServiceSend',
        object: 'ObjectSend',
        workflow: 'WorkflowSend',
      }[call.target]
    : { service: 'Service', object: 'Object', workflow: 'Workflow' }[
        call.target
      ];
  const types = call.isSend
    ? `[${inputType}]`
    : `[${inputType}, json.RawMessage]`;
  const targetArgs = [
    quoted(call.service),
    ...(call.target === 'service' ? [] : [quoted(call.key)]),
    quoted(call.handler),
    ...(call.scope !== undefined
      ? [`restate.WithScope(${quoted(call.scope)})`]
      : []),
  ].join(', ');
  const options = [
    ...(call.idempotencyKey
      ? [`restate.WithIdempotencyKey(${quoted(call.idempotencyKey)})`]
      : []),
    ...(call.limitKey
      ? [`restate.WithLimitKey(${quoted(call.limitKey)})`]
      : []),
    ...(call.delayMs !== undefined
      ? [`restate.WithDelay(${goDuration(call.delayMs)})`]
      : []),
  ];
  const args = ['context.Background()', 'input', ...options].join(', ');
  const usesRestate =
    !call.input || call.scope !== undefined || options.length > 0;
  const imports = [
    '"context"',
    ...(call.input || !call.isSend ? ['"encoding/json"'] : []),
    '"fmt"',
    ...(call.delayMs !== undefined ? ['"time"'] : []),
    '',
    ...(usesRestate ? ['restate "github.com/restatedev/sdk-go"'] : []),
    '"github.com/restatedev/sdk-go/ingress"',
  ];
  const connect = call.token
    ? `ingress.NewClient(${quoted(call.ingressUrl)}, ingress.WithAuthKey(${quoted(call.token)}))`
    : `ingress.NewClient(${quoted(call.ingressUrl)})`;
  return [
    '// go get github.com/restatedev/sdk-go',
    'package main',
    '',
    'import (',
    ...imports.map((line) => (line ? `\t${line}` : '')),
    ')',
    '',
    'func main() {',
    `\tclient := ${connect}`,
    `\tinput := ${inputValue}`,
    call.isSend
      ? `\thandle, err := ingress.${constructor}${types}(client, ${targetArgs}).\n\t\tSend(${args})`
      : `\toutput, err := ingress.${constructor}${types}(client, ${targetArgs}).\n\t\tRequest(${args})`,
    '\tif err != nil {',
    '\t\tpanic(err)',
    '\t}',
    call.isSend
      ? '\tfmt.Println(handle.Id())'
      : '\tfmt.Println(string(output))',
    '}',
  ].join('\n');
}

export function toPythonClient(input: RestateClientSnippetInput) {
  const call = clientCall(input);
  if (!call) {
    return undefined;
  }
  const body = call.input
    ? call.input.ok
      ? `json.dumps(${pythonLiteral(call.input.value, 1)}).encode()`
      : `${quoted(call.input.text)}.encode()`
    : 'b""';
  const args = [
    quoted(call.service),
    quoted(call.handler),
    'body',
    ...(call.target !== 'service' ? [`key=${quoted(call.key)}`] : []),
    ...(call.idempotencyKey
      ? [`idempotency_key=${quoted(call.idempotencyKey)}`]
      : []),
    ...(call.scope !== undefined ? [`scope=${quoted(call.scope)}`] : []),
    ...(call.limitKey ? [`limit_key=${quoted(call.limitKey)}`] : []),
    ...(call.delayMs !== undefined
      ? [`send_delay=timedelta(milliseconds=${call.delayMs})`]
      : []),
    'headers={"Content-Type": "application/json"}',
  ];
  const connect = call.token
    ? `restate.create_client(\n        ${quoted(call.ingressUrl)},\n        headers={"Authorization": ${quoted(`Bearer ${call.token}`)}},\n    )`
    : `restate.create_client(${quoted(call.ingressUrl)})`;
  return [
    '# pip install "restate-sdk[client]"',
    'import asyncio',
    'import json',
    ...(call.delayMs !== undefined ? ['from datetime import timedelta'] : []),
    '',
    'import restate',
    '',
    '',
    'async def main():',
    `    body = ${body}`,
    `    async with ${connect} as client:`,
    `        ${call.isSend ? 'handle' : 'result'} = await client.${call.isSend ? 'generic_send' : 'generic_call'}(`,
    ...args.map((arg) => `            ${arg},`),
    '        )',
    call.isSend
      ? '        print(handle.invocation_id)'
      : '        print(json.loads(result) if result else None)',
    '',
    '',
    'asyncio.run(main())',
  ].join('\n');
}
