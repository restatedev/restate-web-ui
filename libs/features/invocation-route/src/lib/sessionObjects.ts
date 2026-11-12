import type { Service } from '@restate/data-access-admin-api-spec';
import { HIDDEN_ENTRY_NAME_PREFIX_METADATA_KEY } from './hiddenEntries';

// A Session Object (`@restatedev/sessions`) is a Virtual Object that keeps a
// SQL database per key in its state, as pages under this prefix. The SDK
// declares the prefix only through the hidden-entries metadata above, so that
// is what identifies one for now; switch to an explicit marker once the SDK
// sets one.
const SESSION_OBJECT_STATE_KEY_PREFIX = 'v22/';

export type SessionObjectService = Pick<Service, 'ty' | 'metadata'>;

export function getSessionObjectStateKeyPrefix(
  service?: SessionObjectService | null,
): string | undefined {
  if (service?.ty !== 'VirtualObject') {
    return undefined;
  }
  const prefix =
    service.metadata?.[HIDDEN_ENTRY_NAME_PREFIX_METADATA_KEY]?.trim();
  return prefix === SESSION_OBJECT_STATE_KEY_PREFIX ? prefix : undefined;
}

export function isSessionObject(
  service?: SessionObjectService | null,
): boolean {
  return getSessionObjectStateKeyPrefix(service) !== undefined;
}
