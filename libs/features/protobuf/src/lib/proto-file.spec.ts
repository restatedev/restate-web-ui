import { toJson } from '@bufbuild/protobuf';
import { FileDescriptorSetSchema } from '@bufbuild/protobuf/wkt';
import { getProtoFileContent } from './proto-file';
import {
  createDescriptorSet,
  createDescriptorSetTypeRef,
  createDescriptorTypeRef,
  createUrlTypeRef,
  expectedProtoFileContent,
} from '../../test/test-fixtures';

describe('proto file content', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns proto file content from a file descriptor set', async () => {
    const protoFileContent = await getProtoFileContent(createDescriptorSetTypeRef());

    expect(protoFileContent).toBe(expectedProtoFileContent);
  });

  it('returns proto file content from a single file descriptor', async () => {
    const protoFileContent = await getProtoFileContent(createDescriptorTypeRef());

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
});
