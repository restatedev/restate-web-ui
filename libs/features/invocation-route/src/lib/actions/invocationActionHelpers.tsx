import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';

const INVOCATION_ID_FIELD = 'invocation-id';

export function InvocationActionHiddenInput({
  queryParam,
}: {
  queryParam: string;
}) {
  const [searchParams] = useSearchParams();
  return (
    <input
      type="hidden"
      name={INVOCATION_ID_FIELD}
      value={searchParams.get(queryParam) ?? ''}
    />
  );
}

export function InvocationActionId({ value }: { value: string }) {
  return (
    <code className="font-semibold">
      {value.substring(0, 8)}…{value.slice(-5)}
    </code>
  );
}

export function getInvocationActionFormData(invocationId: string) {
  const formData = new FormData();
  formData.append(INVOCATION_ID_FIELD, invocationId);
  return formData;
}

export function getInvocationActionId(
  input: URLSearchParams | FormData,
  queryParam: string,
) {
  const value =
    input instanceof URLSearchParams
      ? input.get(queryParam)
      : input.get(INVOCATION_ID_FIELD);
  return typeof value === 'string' ? value : null;
}

export function getInvocationActionSubmitData(
  event: FormEvent<HTMLFormElement> | FormData,
) {
  if (event instanceof FormData) return event;
  event.preventDefault();
  return new FormData(event.currentTarget);
}
