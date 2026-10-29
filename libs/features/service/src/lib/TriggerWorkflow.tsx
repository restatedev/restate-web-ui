import { useSchemaRegistry } from '@restate/data-access-admin-api';
import { useServiceDetails } from '@restate/data-access-admin-api-hooks';
import { muxPost } from '@restate/data-access-ingress-mux';
import { useRestateContext } from '@restate/features-restate-context';
import { Button, SubmitButton } from '@restate/ui-button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  QueryDialog,
} from '@restate/ui-dialog';
import { ErrorBanner } from '@restate/ui-error';
import {
  FormFieldCode,
  FormFieldInput,
  FormFieldLabel,
} from '@restate/ui-form-field';
import { Icon, IconName } from '@restate/ui-icons';
import { Link } from '@restate/ui-link';
import { Spinner } from '@restate/ui-loading';
import { tv } from '@restate/util-styles';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { Heading } from 'react-aria-components';
import { useSearchParams } from 'react-router';
import {
  getWorkflowRunHandler,
  TANSTACK_WORKFLOW_RUN_HANDLER,
  workflowPayloadSkeleton,
} from './tanstackWorkflow';

export const TRIGGER_WORKFLOW_QUERY = 'trigger-workflow';

interface SendAnswer {
  invocationId: string;
  status: 'Accepted' | 'PreviouslyAccepted' | (string & {});
}

const triggerStyles = tv({
  base: 'flex shrink-0 items-center gap-1 no-underline',
  variants: {
    variant: {
      row: 'rounded-lg px-1.5 py-0.5 text-2xs',
      header: 'rounded-lg px-2 py-0.5 text-[0.9375rem]',
    },
  },
});

export function TriggerWorkflowButton({
  service,
  variant = 'row',
}: {
  service: string;
  variant?: 'row' | 'header';
}) {
  const registry = useSchemaRegistry();
  const { ingressMuxUrl } = useRestateContext();
  if (!registry || !ingressMuxUrl) {
    return null;
  }
  return (
    <Link
      href={`?${TRIGGER_WORKFLOW_QUERY}=${encodeURIComponent(service)}`}
      variant="secondary-button"
      aria-label={`Trigger ${service}`}
      className={triggerStyles({ variant })}
    >
      <Icon name={IconName.Play} className="h-3 w-3 shrink-0" />
      Trigger
    </Link>
  );
}

export function TriggerWorkflowDialog() {
  const [searchParams] = useSearchParams();
  const service = searchParams.get(TRIGGER_WORKFLOW_QUERY);
  return (
    <QueryDialog query={TRIGGER_WORKFLOW_QUERY}>
      {service && <TriggerWorkflowContent key={service} service={service} />}
    </QueryDialog>
  );
}

function parsePayload(value: string): { payload?: unknown; error?: string } {
  try {
    return { payload: JSON.parse(value) };
  } catch {
    return { error: 'The payload must be valid JSON.' };
  }
}

function TriggerWorkflowContent({ service }: { service: string }) {
  const formId = useId();
  const registry = useSchemaRegistry();
  const { ingressMuxUrl = '', baseUrl } = useRestateContext();
  const [runId, setRunId] = useState<string>(() => crypto.randomUUID());
  const [payloadError, setPayloadError] = useState<string>();
  const { data, isPending } = useServiceDetails(service);
  const inputSchema = getWorkflowRunHandler(data?.handlers)?.input_json_schema;
  const send = useMutation({
    mutationFn: ({ runId, payload }: { runId: string; payload: unknown }) =>
      muxPost<SendAnswer>({
        muxUrl: ingressMuxUrl,
        scope: registry?.scope,
        path: `/restate/send/${encodeURIComponent(service)}/${TANSTACK_WORKFLOW_RUN_HANDLER}`,
        body: payload,
        headers: { 'idempotency-key': runId },
      }),
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { payload, error } = parsePayload(String(form.get('payload') ?? ''));
    setPayloadError(error);
    if (!error) {
      send.mutate({ runId: runId.trim(), payload });
    }
  };

  const answer = send.data;

  return (
    <DialogContent className="max-w-lg">
      <div className="flex flex-col gap-2">
        <Heading
          slot="title"
          level={3}
          className="text-lg leading-6 font-medium text-primary"
        >
          Trigger <span className="font-mono">{service}</span>
        </Heading>
        <p className="text-sm text-muted">
          Starts a run of the workflow. The run ID is its idempotency key:
          triggering again with the same ID returns the existing run.
        </p>
        {answer ? (
          <div className="mt-2 flex flex-col gap-1 rounded-xl border border-success bg-success-subtle p-3 text-0.5xs text-success">
            <span className="font-medium">
              {answer.status === 'PreviouslyAccepted'
                ? 'A run with this ID already exists.'
                : 'Run started.'}
            </span>
            <Link
              href={`${baseUrl}/invocations/${encodeURIComponent(answer.invocationId)}`}
              preserveQueryParams={false}
              className="font-mono"
            >
              {answer.invocationId}
            </Link>
          </div>
        ) : (
          <form
            id={formId}
            onSubmit={onSubmit}
            className="mt-2 flex flex-col gap-4"
          >
            <FormFieldInput
              name="runId"
              label="Run ID"
              value={runId}
              onChange={setRunId}
              required
            />
            <div className="flex flex-col">
              <FormFieldLabel>
                <span slot="title">Payload</span>
                <span slot="description">
                  The workflow’s input as JSON. The workflow validates it.
                </span>
              </FormFieldLabel>
              {isPending ? (
                <span className="flex h-28 items-center gap-2 text-sm text-muted">
                  <Spinner />
                  Loading the input schema…
                </span>
              ) : (
                <FormFieldCode
                  name="payload"
                  value={workflowPayloadSkeleton(inputSchema)}
                  className="h-28"
                />
              )}
            </div>
          </form>
        )}
        <DialogFooter>
          <div className="flex flex-col gap-2">
            {(payloadError || send.error) && (
              <ErrorBanner
                error={payloadError ? new Error(payloadError) : send.error}
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <DialogClose>
                <Button variant="secondary" disabled={send.isPending}>
                  Close
                </Button>
              </DialogClose>
              {answer ? (
                <Button
                  onClick={() => {
                    send.reset();
                    setRunId(crypto.randomUUID());
                  }}
                >
                  Trigger another
                </Button>
              ) : (
                <SubmitButton
                  form={formId}
                  isPending={send.isPending}
                  disabled={isPending}
                >
                  Trigger
                </SubmitButton>
              )}
            </div>
          </div>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
