import { create, toBinary, toJson } from '@bufbuild/protobuf';
import {
  DescriptorProtoSchema,
  FieldDescriptorProtoSchema,
  FileDescriptorProtoSchema,
  FileDescriptorSetSchema,
} from '@bufbuild/protobuf/wkt';
import {
  decodeProtobuf,
  encodeProtobuf,
  loadProtobufCodec,
} from './protobuf';
import type { ProtobufTypeRef } from './types';

const messageType = 'test.v1.ExamplePayload';
const samplePayload = {
  foo: 'baz',
};
const LABEL_OPTIONAL = 1;
const TYPE_STRING = 9;

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

function createDescriptorSet() {
  return create(FileDescriptorSetSchema, {
    file: [createTestFileDescriptor()],
  });
}

function createDescriptorSetTypeRef(): ProtobufTypeRef {
  return {
    schema: {
      type: 'descriptor-set',
      fileDescriptorSet: toBinary(FileDescriptorSetSchema, createDescriptorSet()),
    },
    messageType,
  };
}

function createDescriptorTypeRef(): ProtobufTypeRef {
  return {
    schema: {
      type: 'descriptor',
      fileDescriptor: createTestFileDescriptor(),
    },
    messageType,
  };
}

function createUrlTypeRef(): ProtobufTypeRef {
  return {
    schema: {
      type: 'url',
      url: 'https://example.test/schema.json',
    },
    messageType,
  };
}

describe('protobuf codec', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a codec from a file descriptor set and round-trips a payload', async () => {
    const codec = await loadProtobufCodec(createDescriptorSetTypeRef());

    const encodedPayload = codec.encode(samplePayload, {
      outputEncoding: 'base64',
    });

    expect(typeof encodedPayload).toBe('string');

    const decodedPayload = codec.decode(encodedPayload, {
      payloadEncoding: 'base64',
    });

    expect(decodedPayload).toEqual(samplePayload);
  });

  it('loads a codec from a single file descriptor and round-trips a payload', async () => {
    const codec = await loadProtobufCodec({
      ...createDescriptorTypeRef(),
      messageType: `.${messageType}`,
    });

    const encodedPayload = codec.encode(samplePayload);
    const decodedPayload = codec.decode(encodedPayload);

    expect(codec.messageType).toBe(messageType);
    expect(decodedPayload).toEqual(samplePayload);
  });

  it('loads a codec from a schema url and round-trips a payload', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(toJson(FileDescriptorSetSchema, createDescriptorSet())), {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        }),
      );

    const codec = await loadProtobufCodec(createUrlTypeRef());
    const encodedPayload = codec.encode(samplePayload);
    const decodedPayload = codec.decode(encodedPayload);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(decodedPayload).toEqual(samplePayload);
  });

  it('supports one-shot encode and decode helpers', async () => {
    const typeRef = createDescriptorSetTypeRef();

    const encodedPayload = await encodeProtobuf(typeRef, samplePayload, {
      outputEncoding: 'base64',
    });
    const decodedPayload = await decodeProtobuf(typeRef, encodedPayload, {
      payloadEncoding: 'base64',
    });

    expect(decodedPayload).toEqual(samplePayload);
  });
});
