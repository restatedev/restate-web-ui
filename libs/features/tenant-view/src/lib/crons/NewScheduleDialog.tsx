import { useSchemaRegistry } from '@restate/data-access-admin-api';
import { useListServices } from '@restate/data-access-admin-api-hooks';
import { Button, SubmitButton } from '@restate/ui-button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from '@restate/ui-dialog';
import { ErrorBanner } from '@restate/ui-error';
import {
  FormFieldCode,
  FormFieldCombobox,
  FormFieldInput,
  FormFieldLabel,
} from '@restate/ui-form-field';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { useFilter } from 'react-aria';
import { Heading } from 'react-aria-components';
import type { CreateScheduleRequest, CronSchedule } from './cronApi';
import { useCreateSchedule, useUpdateSchedule } from './useCrons';

const TIMEZONES = [
  'UTC',
  ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== 'UTC'),
].map((zone) => ({ id: zone, label: zone }));

function parsePayload(value: string): { payload?: unknown; error?: string } {
  if (!value.trim()) {
    return {};
  }
  try {
    return { payload: JSON.parse(value) };
  } catch {
    return { error: 'The payload must be valid JSON.' };
  }
}

export function NewScheduleDialog({
  scope,
  schedule,
  open,
  onOpenChange,
}: {
  scope: string;
  schedule?: CronSchedule;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <NewScheduleDialogContent
          scope={scope}
          schedule={schedule}
          onOpenChange={onOpenChange}
        />
      )}
    </Dialog>
  );
}

function NewScheduleDialogContent({
  scope,
  schedule,
  onOpenChange,
}: {
  scope: string;
  schedule?: CronSchedule;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const formId = useId();
  const { contains } = useFilter({ sensitivity: 'base' });
  const registry = useSchemaRegistry();
  const { data: services } = useListServices({ enabled: Boolean(registry) });
  const [service, setService] = useState(schedule?.target.service ?? '');
  const [payloadError, setPayloadError] = useState<string>();
  const create = useCreateSchedule(scope, {
    onSuccess: () => onOpenChange(false),
  });
  const update = useUpdateSchedule(scope, {
    onSuccess: () => onOpenChange(false),
  });
  const mutation = schedule ? update : create;
  const serviceOptions = useMemo(
    () =>
      Array.from(services.values())
        .filter(({ ty }) => ty === 'Service')
        .map(({ name }) => ({ id: name, label: name }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    [services],
  );
  const handlerOptions = useMemo(
    () =>
      (services.get(service)?.handlers ?? []).map(({ name }) => ({
        id: name,
        label: name,
      })),
    [service, services],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? '').trim();
    const { payload, error } = parsePayload(String(form.get('payload') ?? ''));
    setPayloadError(error);
    if (error) {
      return;
    }
    const request: CreateScheduleRequest = {
      cron: field('cron'),
      timezone: field('timezone') || 'UTC',
      target: { service: field('service'), handler: field('handler') },
      ...(payload !== undefined && { payload }),
    };
    if (schedule) {
      update.mutate({ ...request, id: schedule.id });
    } else {
      create.mutate(request);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <div className="flex flex-col gap-2">
        <Heading
          slot="title"
          level={3}
          className="text-lg leading-6 font-medium text-primary"
        >
          {schedule ? 'Edit schedule' : 'New schedule'}
        </Heading>
        <p className="text-sm text-muted">
          The tenant’s cron calls the target handler in{' '}
          <span className="font-mono">{scope}</span> at every occurrence, with a
          fresh idempotency key. The target must be a plain service.
        </p>
        <form
          id={formId}
          onSubmit={onSubmit}
          className="mt-2 flex flex-col gap-4"
        >
          <div className="grid grid-cols-[3fr_2fr] gap-2">
            <FormFieldInput
              name="cron"
              label="Cron expression"
              placeholder="*/5 * * * *"
              defaultValue={schedule?.cron.expression}
              required
              autoFocus
            />
            <FormFieldCombobox
              name="timezone"
              label="Timezone"
              options={TIMEZONES}
              defaultValue={schedule?.cron.timezone ?? 'UTC'}
              defaultFilter={contains}
              allowsCustomValue
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormFieldCombobox
              name="service"
              label="Service"
              options={serviceOptions}
              defaultValue={schedule?.target.service}
              defaultFilter={contains}
              onChange={setService}
              allowsCustomValue
              allowsEmptyCollection
              required
            />
            <FormFieldCombobox
              key={service}
              name="handler"
              label="Handler"
              options={handlerOptions}
              defaultValue={
                service === schedule?.target.service
                  ? schedule.target.handler
                  : undefined
              }
              defaultFilter={contains}
              allowsCustomValue
              allowsEmptyCollection
              required
            />
          </div>
          <div className="flex flex-col">
            <FormFieldLabel>
              <span slot="title">Payload</span>
              <span slot="description">
                Optional JSON sent as the handler’s input on every run.
              </span>
            </FormFieldLabel>
            <FormFieldCode
              name="payload"
              value={
                schedule?.payload === undefined
                  ? ''
                  : JSON.stringify(schedule.payload, null, 2)
              }
              className="h-28"
            />
          </div>
        </form>
        <DialogFooter>
          <div className="flex flex-col gap-2">
            {(payloadError || mutation.error) && (
              <ErrorBanner
                error={payloadError ? new Error(payloadError) : mutation.error}
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <DialogClose>
                <Button variant="secondary" disabled={mutation.isPending}>
                  Close
                </Button>
              </DialogClose>
              <SubmitButton form={formId} isPending={mutation.isPending}>
                {schedule ? 'Save' : 'Create'}
              </SubmitButton>
            </div>
          </div>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
