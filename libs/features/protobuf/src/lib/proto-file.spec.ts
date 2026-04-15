import { create, toBinary, toJson } from '@bufbuild/protobuf';
import {
  DescriptorProtoSchema,
  DescriptorProto_ExtensionRangeSchema,
  EnumDescriptorProtoSchema,
  EnumValueDescriptorProtoSchema,
  FieldDescriptorProtoSchema,
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
  MessageOptionsSchema,
  MethodDescriptorProtoSchema,
  OneofDescriptorProtoSchema,
  ServiceDescriptorProtoSchema,
  type FileDescriptorProto,
} from '@bufbuild/protobuf/wkt';
import { getProtoFileContent } from './proto-file';
import * as schemaModule from './schema';
import type { ProtobufTypeRef } from './types';
import {
  createDescriptorSet,
  createDescriptorSetTypeRef,
  createDescriptorTypeRef,
  createUrlTypeRef,
  expectedProtoFileContent,
} from '../../test/test-fixtures';

const LABEL_OPTIONAL = 1;
const LABEL_REQUIRED = 2;
const LABEL_REPEATED = 3;
const TYPE_INT32 = 5;
const TYPE_STRING = 9;
const TYPE_MESSAGE = 11;
const TYPE_ENUM = 14;

function createDescriptorSetTypeRefFor(
  messageType: string,
  files: FileDescriptorProto[],
): ProtobufTypeRef {
  return {
    schema: {
      type: 'descriptor-set',
      fileDescriptorSet: toBinary(
        FileDescriptorSetSchema,
        create(FileDescriptorSetSchema, {
          file: files,
        }),
      ),
    },
    messageType,
  };
}

function createComplexProto3TypeRef(): ProtobufTypeRef {
  const sharedFile = create(FileDescriptorProtoSchema, {
    name: 'shared.proto',
    package: 'shared.v1',
    syntax: 'proto3',
    messageType: [
      create(DescriptorProtoSchema, {
        name: 'SharedMessage',
        field: [
          create(FieldDescriptorProtoSchema, {
            name: 'id',
            jsonName: 'id',
            number: 1,
            label: LABEL_OPTIONAL,
            type: TYPE_STRING,
          }),
        ],
      }),
    ],
  });

  const legacyFile = create(FileDescriptorProtoSchema, {
    name: 'legacy.proto',
    package: 'legacy.v1',
    syntax: 'proto3',
  });

  const mainFile = create(FileDescriptorProtoSchema, {
    name: 'complex.proto',
    package: 'test.v1',
    syntax: 'proto3',
    dependency: ['shared.proto', 'legacy.proto'],
    publicDependency: [0],
    weakDependency: [1],
    enumType: [
      create(EnumDescriptorProtoSchema, {
        name: 'TopLevelState',
        value: [
          create(EnumValueDescriptorProtoSchema, {
            name: 'TOP_LEVEL_STATE_UNSPECIFIED',
            number: 0,
          }),
          create(EnumValueDescriptorProtoSchema, {
            name: 'TOP_LEVEL_STATE_ACTIVE',
            number: 1,
          }),
        ],
      }),
    ],
    messageType: [
      create(DescriptorProtoSchema, {
        name: 'ComplexPayload',
        field: [
          create(FieldDescriptorProtoSchema, {
            name: 'name',
            jsonName: 'name',
            number: 1,
            label: LABEL_OPTIONAL,
            type: TYPE_STRING,
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'alias',
            jsonName: 'alias',
            number: 2,
            label: LABEL_OPTIONAL,
            type: TYPE_STRING,
            proto3Optional: true,
            oneofIndex: 1,
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'scores',
            jsonName: 'scores',
            number: 3,
            label: LABEL_REPEATED,
            type: TYPE_INT32,
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'labels',
            jsonName: 'labels',
            number: 4,
            label: LABEL_REPEATED,
            type: TYPE_MESSAGE,
            typeName: '.test.v1.ComplexPayload.LabelsEntry',
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'shared',
            jsonName: 'shared',
            number: 5,
            label: LABEL_OPTIONAL,
            type: TYPE_MESSAGE,
            typeName: '.shared.v1.SharedMessage',
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'details',
            jsonName: 'details',
            number: 6,
            label: LABEL_REPEATED,
            type: TYPE_MESSAGE,
            typeName: '.test.v1.ComplexPayload.Detail',
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'email_address',
            jsonName: 'emailAddress',
            number: 7,
            label: LABEL_OPTIONAL,
            type: TYPE_STRING,
            oneofIndex: 0,
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'age_years',
            jsonName: 'ageYears',
            number: 8,
            label: LABEL_OPTIONAL,
            type: TYPE_INT32,
            oneofIndex: 0,
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'state_history',
            jsonName: 'stateHistory',
            number: 9,
            label: LABEL_REPEATED,
            type: TYPE_ENUM,
            typeName: '.test.v1.TopLevelState',
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'state_labels',
            jsonName: 'stateLabels',
            number: 10,
            label: LABEL_REPEATED,
            type: TYPE_MESSAGE,
            typeName: '.test.v1.ComplexPayload.StateLabelsEntry',
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'detail_lookup',
            jsonName: 'detailLookup',
            number: 11,
            label: LABEL_REPEATED,
            type: TYPE_MESSAGE,
            typeName: '.test.v1.ComplexPayload.DetailLookupEntry',
          }),
        ],
        oneofDecl: [
          create(OneofDescriptorProtoSchema, {
            name: 'choice',
          }),
          create(OneofDescriptorProtoSchema, {
            name: '_alias',
          }),
        ],
        enumType: [
          create(EnumDescriptorProtoSchema, {
            name: 'Status',
            value: [
              create(EnumValueDescriptorProtoSchema, {
                name: 'STATUS_UNSPECIFIED',
                number: 0,
              }),
              create(EnumValueDescriptorProtoSchema, {
                name: 'STATUS_READY',
                number: 1,
              }),
            ],
          }),
        ],
        nestedType: [
          create(DescriptorProtoSchema, {
            name: 'LabelsEntry',
            field: [
              create(FieldDescriptorProtoSchema, {
                name: 'key',
                jsonName: 'key',
                number: 1,
                label: LABEL_OPTIONAL,
                type: TYPE_STRING,
              }),
              create(FieldDescriptorProtoSchema, {
                name: 'value',
                jsonName: 'value',
                number: 2,
                label: LABEL_OPTIONAL,
                type: TYPE_STRING,
              }),
            ],
            options: create(MessageOptionsSchema, {
              mapEntry: true,
            }),
          }),
          create(DescriptorProtoSchema, {
            name: 'StateLabelsEntry',
            field: [
              create(FieldDescriptorProtoSchema, {
                name: 'key',
                jsonName: 'key',
                number: 1,
                label: LABEL_OPTIONAL,
                type: TYPE_STRING,
              }),
              create(FieldDescriptorProtoSchema, {
                name: 'value',
                jsonName: 'value',
                number: 2,
                label: LABEL_OPTIONAL,
                type: TYPE_ENUM,
                typeName: '.test.v1.TopLevelState',
              }),
            ],
            options: create(MessageOptionsSchema, {
              mapEntry: true,
            }),
          }),
          create(DescriptorProtoSchema, {
            name: 'DetailLookupEntry',
            field: [
              create(FieldDescriptorProtoSchema, {
                name: 'key',
                jsonName: 'key',
                number: 1,
                label: LABEL_OPTIONAL,
                type: TYPE_STRING,
              }),
              create(FieldDescriptorProtoSchema, {
                name: 'value',
                jsonName: 'value',
                number: 2,
                label: LABEL_OPTIONAL,
                type: TYPE_MESSAGE,
                typeName: '.test.v1.ComplexPayload.Detail',
              }),
            ],
            options: create(MessageOptionsSchema, {
              mapEntry: true,
            }),
          }),
          create(DescriptorProtoSchema, {
            name: 'Detail',
            field: [
              create(FieldDescriptorProtoSchema, {
                name: 'status',
                jsonName: 'status',
                number: 1,
                label: LABEL_OPTIONAL,
                type: TYPE_ENUM,
                typeName: '.test.v1.ComplexPayload.Status',
              }),
            ],
          }),
        ],
      }),
    ],
    service: [
      create(ServiceDescriptorProtoSchema, {
        name: 'ComplexService',
        method: [
          create(MethodDescriptorProtoSchema, {
            name: 'GetComplex',
            inputType: '.test.v1.ComplexPayload',
            outputType: '.test.v1.ComplexPayload',
          }),
          create(MethodDescriptorProtoSchema, {
            name: 'WatchComplex',
            inputType: '.test.v1.ComplexPayload',
            outputType: '.test.v1.ComplexPayload',
            serverStreaming: true,
          }),
          create(MethodDescriptorProtoSchema, {
            name: 'UploadComplex',
            inputType: '.test.v1.ComplexPayload',
            outputType: '.test.v1.ComplexPayload',
            clientStreaming: true,
          }),
          create(MethodDescriptorProtoSchema, {
            name: 'ChatComplex',
            inputType: '.test.v1.ComplexPayload',
            outputType: '.test.v1.ComplexPayload',
            clientStreaming: true,
            serverStreaming: true,
          }),
        ],
      }),
    ],
  });

  return createDescriptorSetTypeRefFor('test.v1.ComplexPayload', [
    sharedFile,
    legacyFile,
    mainFile,
  ]);
}

function createProto2ExtensionTypeRef(): ProtobufTypeRef {
  const file = create(FileDescriptorProtoSchema, {
    name: 'extensions.proto',
    package: 'test.v1',
    syntax: 'proto2',
    messageType: [
      create(DescriptorProtoSchema, {
        name: 'Extensible',
        field: [
          create(FieldDescriptorProtoSchema, {
            name: 'name',
            jsonName: 'name',
            number: 1,
            label: LABEL_OPTIONAL,
            type: TYPE_STRING,
          }),
          create(FieldDescriptorProtoSchema, {
            name: 'id',
            jsonName: 'id',
            number: 2,
            label: LABEL_REQUIRED,
            type: TYPE_INT32,
          }),
        ],
        extensionRange: [
          create(DescriptorProto_ExtensionRangeSchema, {
            start: 100,
            end: 200,
          }),
        ],
      }),
      create(DescriptorProtoSchema, {
        name: 'Container',
        extension: [
          create(FieldDescriptorProtoSchema, {
            name: 'score',
            jsonName: 'score',
            number: 101,
            label: LABEL_OPTIONAL,
            type: TYPE_INT32,
            extendee: '.test.v1.Extensible',
          }),
        ],
      }),
    ],
    extension: [
      create(FieldDescriptorProtoSchema, {
        name: 'nickname',
        jsonName: 'nickname',
        number: 100,
        label: LABEL_OPTIONAL,
        type: TYPE_STRING,
        extendee: '.test.v1.Extensible',
      }),
    ],
  });

  return createDescriptorSetTypeRefFor('test.v1.Extensible', [file]);
}

describe('proto file content', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns proto file content from a file descriptor set', async () => {
    const protoFileContent = await getProtoFileContent(
      createDescriptorSetTypeRef(),
    );

    expect(protoFileContent).toBe(expectedProtoFileContent);
  });

  it('returns proto file content from a single file descriptor', async () => {
    const protoFileContent = await getProtoFileContent(
      createDescriptorTypeRef(),
    );

    expect(protoFileContent).toBe(expectedProtoFileContent);
  });

  it('returns proto file content from a schema url', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(toJson(FileDescriptorSetSchema, createDescriptorSet())),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    const protoFileContent = await getProtoFileContent(createUrlTypeRef());

    expect(protoFileContent).toBe(expectedProtoFileContent);
  });

  it('returns a safe fallback when the descriptor set is corrupted', async () => {
    const protoFileContent = await getProtoFileContent({
      schema: {
        type: 'descriptor-set',
        fileDescriptorSet: new Uint8Array([1, 2, 3]),
      },
      messageType: 'test.v1.ExamplePayload',
    });

    expect(protoFileContent)
      .toBe(`// Unable to render .proto source for "test.v1.ExamplePayload".
// The schema could not be parsed or formatted into .proto source.
`);
  });

  it('returns a safe fallback when the requested message type is missing', async () => {
    const protoFileContent = await getProtoFileContent({
      ...createDescriptorSetTypeRef(),
      messageType: 'test.v1.DoesNotExist',
    });

    expect(protoFileContent)
      .toBe(`// Unable to render .proto source for "test.v1.DoesNotExist".
// The requested message type was not found in the provided schema.
`);
  });

  it('returns a safe fallback when the schema url cannot be loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    const protoFileContent = await getProtoFileContent(createUrlTypeRef());

    expect(protoFileContent)
      .toBe(`// Unable to render .proto source for "test.v1.ExamplePayload".
// The schema could not be loaded from the provided URL.
`);
  });

  it('returns a safe fallback when an unexpected internal error happens', async () => {
    vi.spyOn(schemaModule, 'resolveMessageDescriptor').mockRejectedValue(
      new Error('boom'),
    );

    const protoFileContent = await getProtoFileContent(
      createDescriptorSetTypeRef(),
    );

    expect(protoFileContent)
      .toBe(`// Unable to render .proto source for "test.v1.ExamplePayload".
// The schema could not be parsed or formatted into .proto source.
`);
  });

  it('formats complex proto3 shapes including imports, collections, nested types, oneofs, and services', async () => {
    const protoFileContent = await getProtoFileContent(
      createComplexProto3TypeRef(),
    );

    expect(protoFileContent).toBe(`syntax = "proto3";

package test.v1;

import public "shared.proto";
import weak "legacy.proto";

enum TopLevelState {
  TOP_LEVEL_STATE_UNSPECIFIED = 0;
  TOP_LEVEL_STATE_ACTIVE = 1;
}

message ComplexPayload {
  string name = 1;
  optional string alias = 2;
  repeated int32 scores = 3;
  map<string, string> labels = 4;
  shared.v1.SharedMessage shared = 5;
  repeated Detail details = 6;
  oneof choice {
    string email_address = 7;
    int32 age_years = 8;
  }
  repeated TopLevelState state_history = 9;
  map<string, TopLevelState> state_labels = 10;
  map<string, Detail> detail_lookup = 11;

  enum Status {
    STATUS_UNSPECIFIED = 0;
    STATUS_READY = 1;
  }

  message Detail {
    Status status = 1;
  }
}

service ComplexService {
  rpc GetComplex(ComplexPayload) returns (ComplexPayload);
  rpc WatchComplex(ComplexPayload) returns (stream ComplexPayload);
  rpc UploadComplex(stream ComplexPayload) returns (ComplexPayload);
  rpc ChatComplex(stream ComplexPayload) returns (stream ComplexPayload);
}
`);
  });

  it('formats proto2 field labels and extensions', async () => {
    const protoFileContent = await getProtoFileContent(
      createProto2ExtensionTypeRef(),
    );

    expect(protoFileContent).toBe(`syntax = "proto2";

package test.v1;

message Extensible {
  optional string name = 1;
  required int32 id = 2;
}

message Container {
  extend Extensible {
    optional int32 score = 101;
  }
}

extend Extensible {
  optional string nickname = 100;
}
`);
  });
});
