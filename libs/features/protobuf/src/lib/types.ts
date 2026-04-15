import type { JsonValue } from '@bufbuild/protobuf';
import type {
  FileDescriptorProto,
  FileDescriptorSet,
} from '@bufbuild/protobuf/wkt';

export type ProtobufSchema =
  | {
      type: 'url';
      url: string;
      format?: 'binary' | 'json';
      fetchInit?: RequestInit;
    }
  | {
      type: 'descriptor-set';
      fileDescriptorSet: Uint8Array | FileDescriptorSet;
    }
  | {
      type: 'descriptor';
      fileDescriptor: FileDescriptorProto;
      resolveImport?: (fileName: string) => FileDescriptorProto | undefined;
    };

export interface ProtobufTypeRef {
  schema: ProtobufSchema;
  messageType: string;
}

export interface ProtobufDecodeOptions {
  payloadEncoding?: 'binary' | 'base64';
  useProtoFieldName?: boolean;
  emitDefaultValues?: boolean;
  enumAsInteger?: boolean;
}

export interface ProtobufEncodeOptions {
  outputEncoding?: 'binary' | 'base64';
  ignoreUnknownFields?: boolean;
}

export interface ProtobufCodec {
  readonly messageType: string;
  decode(
    payload: Uint8Array | string,
    options?: ProtobufDecodeOptions,
  ): JsonValue;
  encode(
    message: JsonValue,
    options?: ProtobufEncodeOptions,
  ): Uint8Array | string;
}
