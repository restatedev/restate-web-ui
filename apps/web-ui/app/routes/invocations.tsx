import { invocations } from '@restate/features/invocations-route';

export default invocations.Component;
export const clientLoader = invocations.clientLoader;
export const shouldRevalidate = invocations.shouldRevalidate;
export function meta() {
  return [{ title: 'Restate - Invocations' }];
}
