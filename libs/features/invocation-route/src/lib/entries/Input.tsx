import { JournalEntryV2 } from '@restate/data-access/admin-api-spec';
import {
  CodecOptionsProvider,
  type RestateCodecOptions,
} from '@restate/features/codec';
import { EntryProps } from './types';
import { Target } from '../Target';
import { tv } from '@restate/util/styles';
import { EntryExpression } from './EntryExpression';
import { Icon, IconName } from '@restate/ui/icons';
import { LazyJournalEntryPayload } from './LazyJournalEntryPayload';

const inputStyles = tv({
  base: '',
  slots: {
    root: 'ml-2 flex max-w-full flex-none items-center self-center [font-size:inherit] **:data-target:font-sans **:data-target:font-medium',
    target: 'flex-none',
    expression: 'flex min-w-0 translate-y-px items-center pl-2',
  },
});

type InputProps = Partial<
  EntryProps<Extract<JournalEntryV2, { type?: 'Input'; category?: 'command' }>>
>;

export function Input({ entry, invocation, className }: InputProps) {
  const handlerName = invocation?.target_handler_name;
  const codecOptions = entry
    ? ({
        service: {
          value: {
            name: invocation?.target_service_name,
          },
        },
        deploymentId: {
          value:
            invocation?.pinned_deployment_id ??
            invocation?.last_attempt_deployment_id,
        },
        key: invocation?.target_service_key,
        handler: {
          value: {
            name: handlerName,
          },
        },
        command: { type: entry.type },
      } satisfies RestateCodecOptions)
    : undefined;
  const { root, target, expression } = inputStyles();

  return (
    <div className={root({ className })}>
      <Target
        target={invocation?.target}
        showHandler={!entry}
        className={target()}
      />
      {entry ? (
        <div className={expression()}>
          <Icon
            name={IconName.Function}
            className="-mr-0.5 h-5 w-5 shrink-0 text-zinc-400"
          />
          <EntryExpression
            entry={entry}
            invocation={invocation}
            name={invocation?.target_handler_name}
            operationSymbol={''}
            input={
              <CodecOptionsProvider options={codecOptions}>
                <LazyJournalEntryPayload.Input
                  invocationId={invocation?.id}
                  entry={entry}
                  title="Input"
                  isBase64
                />
              </CodecOptionsProvider>
            }
          />
          <div data-fill />
        </div>
      ) : null}
    </div>
  );
}
