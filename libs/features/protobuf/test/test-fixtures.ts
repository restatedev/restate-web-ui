import { create, toBinary } from '@bufbuild/protobuf';
import {
  DescriptorProtoSchema,
  FieldDescriptorProtoSchema,
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
} from '@bufbuild/protobuf/wkt';
import type { ProtobufTypeRef } from '../src/lib/types';

const LABEL_OPTIONAL = 1;
const TYPE_STRING = 9;

export const messageType = 'test.v1.ExamplePayload';
export const samplePayload = {
  foo: 'baz',
};

export const expectedProtoFileContent = `syntax = "proto3";

package test.v1;

message ExamplePayload {
  string foo = 1;
}
`;

function createTestFieldDescriptor() {
  return create(FieldDescriptorProtoSchema, {
    name: 'foo',
    jsonName: 'foo',
    number: 1,
    type: TYPE_STRING,
    label: LABEL_OPTIONAL,
  });
}

function createTestMessageDescriptor() {
  return create(DescriptorProtoSchema, {
    name: 'ExamplePayload',
    field: [createTestFieldDescriptor()],
  });
}

function createTestFileDescriptor() {
  return create(FileDescriptorProtoSchema, {
    name: 'test/example_payload.proto',
    package: 'test.v1',
    syntax: 'proto3',
    messageType: [createTestMessageDescriptor()],
  });
}

export function createDescriptorSet() {
  return create(FileDescriptorSetSchema, {
    file: [createTestFileDescriptor()],
  });
}

export function createDescriptorSetTypeRef(): ProtobufTypeRef {
  return {
    schema: {
      type: 'descriptor-set',
      fileDescriptorSet: toBinary(
        FileDescriptorSetSchema,
        createDescriptorSet(),
      ),
    },
    messageType,
  };
}

export function createDescriptorTypeRef(): ProtobufTypeRef {
  return {
    schema: {
      type: 'descriptor',
      fileDescriptor: createTestFileDescriptor(),
    },
    messageType,
  };
}

export function createUrlTypeRef(): ProtobufTypeRef {
  return {
    schema: {
      type: 'url',
      url: 'https://example.test/schema.json',
    },
    messageType,
  };
}
