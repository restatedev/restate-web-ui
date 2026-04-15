import { ScalarType } from '@bufbuild/protobuf';
import type {
  DescEnum,
  DescExtension,
  DescField,
  DescFile,
  DescMessage,
  DescMethod,
  DescOneof,
  DescService,
} from '@bufbuild/protobuf';
import { resolveMessageDescriptor } from './schema';
import type { ProtobufTypeRef } from './types';

/**
 * Indents a multi-line block by the requested protobuf nesting level.
 *
 * @example
 * indent('string foo = 1;')
 * // => '  string foo = 1;'
 */
function indent(value: string, level = 1) {
  const prefix = '  '.repeat(level);
  return value
    .split('\n')
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join('\n');
}

/**
 * Joins logical `.proto` sections with a blank line, skipping empty sections.
 */
function joinSections(sections: Array<string | undefined>) {
  return sections.filter(Boolean).join('\n\n');
}

/**
 * Maps protobuf-es scalar enums back to the `.proto` scalar keyword.
 *
 * @example
 * scalarTypeToProtoKeyword(ScalarType.STRING)
 * // => 'string'
 */
function scalarTypeToProtoKeyword(scalar: ScalarType) {
  switch (scalar) {
    case ScalarType.DOUBLE:
      return 'double';
    case ScalarType.FLOAT:
      return 'float';
    case ScalarType.INT64:
      return 'int64';
    case ScalarType.UINT64:
      return 'uint64';
    case ScalarType.INT32:
      return 'int32';
    case ScalarType.FIXED64:
      return 'fixed64';
    case ScalarType.FIXED32:
      return 'fixed32';
    case ScalarType.BOOL:
      return 'bool';
    case ScalarType.STRING:
      return 'string';
    case ScalarType.BYTES:
      return 'bytes';
    case ScalarType.UINT32:
      return 'uint32';
    case ScalarType.SFIXED32:
      return 'sfixed32';
    case ScalarType.SFIXED64:
      return 'sfixed64';
    case ScalarType.SINT32:
      return 'sint32';
    case ScalarType.SINT64:
      return 'sint64';
  }
}

/**
 * Returns the scope segments used to shorten type references.
 *
 * For `test.v1.Outer.Inner`, the scope becomes `['test', 'v1', 'Outer', 'Inner']`.
 */
function getScopeSegments(scope: DescFile | DescMessage) {
  if (scope.kind === 'file') {
    return scope.proto.package.split('.').filter(Boolean);
  }

  const packageSegments = scope.file.proto.package.split('.').filter(Boolean);
  const parentSegments: string[] = [];
  let currentParent = scope.parent;

  while (currentParent) {
    parentSegments.unshift(currentParent.name);
    currentParent = currentParent.parent;
  }

  return [...packageSegments, ...parentSegments, scope.name];
}

/**
 * Formats a type reference relative to the current file or message scope.
 *
 * @example
 * formatTypeReference('test.v1.ExamplePayload', fileScope)
 * // => 'ExamplePayload'
 */
function formatTypeReference(
  typeName: string,
  scope: DescFile | DescMessage,
) {
  const typeSegments = typeName.split('.');
  const scopeSegments = getScopeSegments(scope);
  let sharedPrefixLength = 0;

  while (
    sharedPrefixLength < typeSegments.length &&
    sharedPrefixLength < scopeSegments.length &&
    typeSegments[sharedPrefixLength] === scopeSegments[sharedPrefixLength]
  ) {
    sharedPrefixLength += 1;
  }

  const shortenedSegments = typeSegments.slice(sharedPrefixLength);

  if (shortenedSegments.length > 0) {
    return shortenedSegments.join('.');
  }

  return typeSegments[typeSegments.length - 1] ?? typeName;
}

/**
 * Formats the type portion of a field declaration, including `repeated` and
 * `map<...>` forms when needed.
 *
 * @example
 * // scalar field
 * // => 'string'
 *
 * @example
 * // repeated message field
 * // => 'repeated ExamplePayload'
 */
function formatFieldType(
  field: DescField | DescExtension,
  scope: DescFile | DescMessage,
) {
  switch (field.fieldKind) {
    case 'scalar':
      return scalarTypeToProtoKeyword(field.scalar);
    case 'enum':
      return formatTypeReference(field.enum.typeName, scope);
    case 'message':
      return formatTypeReference(field.message.typeName, scope);
    case 'list': {
      switch (field.listKind) {
        case 'scalar':
          return `repeated ${scalarTypeToProtoKeyword(field.scalar)}`;
        case 'enum':
          return `repeated ${formatTypeReference(field.enum.typeName, scope)}`;
        case 'message':
          return `repeated ${formatTypeReference(field.message.typeName, scope)}`;
      }

      throw new Error('Unsupported protobuf list kind');
    }
    case 'map': {
      const valueType =
        field.mapKind === 'scalar'
          ? scalarTypeToProtoKeyword(field.scalar)
          : field.mapKind === 'enum'
            ? formatTypeReference(field.enum.typeName, scope)
            : formatTypeReference(field.message.typeName, scope);

      return `map<${scalarTypeToProtoKeyword(field.mapKey)}, ${valueType}>`;
    }
  }

  throw new Error('Unsupported protobuf field kind');
}

/**
 * Formats the proto2/proto3 field label prefix when one is required.
 */
function formatFieldLabel(field: DescField | DescExtension) {
  if (field.fieldKind === 'list' || field.fieldKind === 'map' || field.oneof) {
    return '';
  }

  if (field.proto.proto3Optional) {
    return 'optional ';
  }

  if (field.proto.label === 2) {
    return 'required ';
  }

  const syntax =
    field.kind === 'extension'
      ? field.file.proto.syntax
      : field.parent.file.proto.syntax;

  if (syntax === 'proto2' && field.proto.label === 1) {
    return 'optional ';
  }

  return '';
}

/**
 * Formats a full field declaration line.
 *
 * @example
 * // => 'string foo = 1;'
 */
function formatField(
  field: DescField | DescExtension,
  scope: DescFile | DescMessage,
) {
  return `${formatFieldLabel(field)}${formatFieldType(field, scope)} ${field.name} = ${field.number};`;
}

/**
 * Formats a `oneof` block and its member fields.
 */
function formatOneof(oneof: DescOneof, scope: DescMessage) {
  const body = oneof.fields
    .map((field) => indent(formatField(field, scope)))
    .join('\n');

  return `oneof ${oneof.name} {\n${body}\n}`;
}

/**
 * Formats an enum declaration with its values.
 */
function formatEnum(enumDescriptor: DescEnum) {
  const body = enumDescriptor.values
    .map((value) => indent(`${value.name} = ${value.number};`))
    .join('\n');

  return `enum ${enumDescriptor.name} {\n${body}\n}`;
}

/**
 * Formats a top-level `extend` block.
 */
function formatExtension(extension: DescExtension) {
  const extendee = formatTypeReference(extension.extendee.typeName, extension.file);
  const body = indent(formatField(extension, extension.file));

  return `extend ${extendee} {\n${body}\n}`;
}

/**
 * Formats a nested `extend` block declared inside a message.
 */
function formatNestedExtension(
  extension: DescExtension,
  scope: DescMessage,
) {
  const extendee = formatTypeReference(extension.extendee.typeName, scope);
  const body = indent(formatField(extension, scope));

  return `extend ${extendee} {\n${body}\n}`;
}

/**
 * Formats an RPC signature, including streaming modifiers when present.
 *
 * @example
 * // => 'rpc GetExample(GetExampleRequest) returns (ExamplePayload);'
 */
function formatMethod(method: DescMethod, scope: DescFile) {
  const inputPrefix =
    method.methodKind === 'client_streaming' ||
    method.methodKind === 'bidi_streaming'
      ? 'stream '
      : '';
  const outputPrefix =
    method.methodKind === 'server_streaming' ||
    method.methodKind === 'bidi_streaming'
      ? 'stream '
      : '';

  return `rpc ${method.name}(${inputPrefix}${formatTypeReference(
    method.input.typeName,
    scope,
  )}) returns (${outputPrefix}${formatTypeReference(
    method.output.typeName,
    scope,
  )});`;
}

/**
 * Formats a service block and all of its RPC methods.
 */
function formatService(service: DescService) {
  const body = service.methods
    .map((method) => indent(formatMethod(method, service.file)))
    .join('\n');

  return `service ${service.name} {\n${body}\n}`;
}

/**
 * Formats a message declaration, including fields, oneofs, and nested types.
 *
 * @example
 * // => 'message ExamplePayload {\\n  string foo = 1;\\n}'
 */
function formatMessage(message: DescMessage): string {
  const bodySections: string[] = [
    message.members
      .map((member) =>
        member.kind === 'oneof'
          ? formatOneof(member, message)
          : formatField(member, message),
      )
      .map((member) => indent(member))
      .join('\n'),
    message.nestedEnums
      .map((enumDescriptor) => indent(formatEnum(enumDescriptor)))
      .join('\n\n'),
    message.nestedMessages
      .map((nestedMessage) => indent(formatMessage(nestedMessage)))
      .join('\n\n'),
    message.nestedExtensions
      .map((extension) => indent(formatNestedExtension(extension, message)))
      .join('\n\n'),
  ].filter((section) => section.length > 0);

  if (bodySections.length === 0) {
    return `message ${message.name} {\n}`;
  }

  return `message ${message.name} {\n${bodySections.join('\n\n')}\n}`;
}

/**
 * Formats a protobuf file descriptor back into `.proto` source text.
 *
 * The output includes syntax, package, imports, and all top-level declarations
 * from the file that owns the requested type.
 */
function formatProtoFile(file: DescFile) {
  const importKindsByDependency = new Map<number, 'public' | 'weak'>();

  for (const dependencyIndex of file.proto.publicDependency) {
    importKindsByDependency.set(dependencyIndex, 'public');
  }

  for (const dependencyIndex of file.proto.weakDependency) {
    importKindsByDependency.set(dependencyIndex, 'weak');
  }

  const imports = file.proto.dependency
    .map((dependency, dependencyIndex) => {
      const importKind = importKindsByDependency.get(dependencyIndex);
      const importPrefix =
        importKind === 'public'
          ? 'import public'
          : importKind === 'weak'
            ? 'import weak'
            : 'import';

      return `${importPrefix} "${dependency}";`;
    })
    .join('\n');

  const declarations = [
    file.enums.map((enumDescriptor) => formatEnum(enumDescriptor)).join('\n\n'),
    file.messages.map((message) => formatMessage(message)).join('\n\n'),
    file.extensions.map((extension) => formatExtension(extension)).join('\n\n'),
    file.services.map((service) => formatService(service)).join('\n\n'),
  ];

  return `${joinSections([
    file.proto.syntax ? `syntax = "${file.proto.syntax}";` : undefined,
    file.proto.package ? `package ${file.proto.package};` : undefined,
    imports || undefined,
    ...declarations,
  ])}\n`;
}

/**
 * Returns the `.proto` source for the file that declares the requested type.
 *
 * This works with any supported schema source and is useful for UI previews or
 * copy/export actions that need readable protobuf definitions.
 *
 * @example
 * const proto = await getProtoFileContent({
 *   schema: { type: 'descriptor-set', fileDescriptorSet: bytes },
 *   messageType: 'test.v1.ExamplePayload',
 * });
 */
export async function getProtoFileContent(
  typeRef: ProtobufTypeRef,
): Promise<string> {
  const { messageDescriptor } = await resolveMessageDescriptor(typeRef);
  return formatProtoFile(messageDescriptor.file);
}
