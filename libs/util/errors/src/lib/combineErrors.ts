import { RestateError } from './RestateError';

export function combineErrors(
  primary: Error | null | undefined,
  hint: Error | null | undefined,
): Error | null {
  if (!primary) {
    return hint ?? null;
  }
  if (!hint) {
    return primary;
  }

  if (primary instanceof RestateError) {
    return new RestateError(
      primary.message,
      primary.restate_code,
      primary.isTransient,
      primary.stack,
      primary.status,
      hint,
    );
  }

  const wrapped = new Error(primary.message);
  wrapped.stack = primary.stack;
  wrapped.cause = hint;
  return wrapped;
}
