import type { StateResponse } from '@restate/data-access-admin-api-spec';
import { base64ToUint8Array } from '@restate/util-binary';
import { RestateError } from '@restate/util-errors';

const STATE_MUTATION_CHECK_DELAYS_MS = [100, 200, 400, 800];

function isSameBytes(a: Uint8Array, b: Uint8Array) {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

function hasStateValues(
  state: StateResponse['state'],
  values: Record<string, string | number[]>,
) {
  return Object.entries(values).every(([name, value]) => {
    const entry = state.find((entry) => entry.name === name);
    return (
      entry !== undefined &&
      isSameBytes(
        base64ToUint8Array(entry.value),
        typeof value === 'string'
          ? new TextEncoder().encode(value)
          : Uint8Array.from(value),
      )
    );
  });
}

export async function waitForStateUpdate<
  T extends { state: StateResponse['state']; version?: string },
>(
  refetch: () => Promise<{ data?: T }>,
  version: string | undefined,
  values: Record<string, string | number[]>,
) {
  let data: T | undefined;
  for (const delay of STATE_MUTATION_CHECK_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    ({ data } = await refetch());
    if (!data || hasStateValues(data.state, values)) {
      break;
    }
    if (data.version !== version) {
      throw new RestateError(
        'The state of this object changed before this mutation was processed, so the mutation was discarded. Review the current value and try again.',
      );
    }
  }

  return data;
}
