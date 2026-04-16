import type {
  Handler,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';

export type RestateCodecHandlerMetadata = Partial<
  Pick<
    Handler,
    | 'name'
    | 'metadata'
    | 'input_description'
    | 'input_json_schema'
    | 'output_description'
    | 'output_json_schema'
  >
>;

export interface RestateCodecCommand {
  type?: JournalEntryV2['type'];
  name?: string;
}

export interface RestateCodecOptions {
  service?: string;
  deploymentId?: string;
  key?: string;
  handler?: RestateCodecHandlerMetadata;
  command?: RestateCodecCommand;
}
