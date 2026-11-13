import type { Invocation } from '@restate/data-access-admin-api-spec';
import { RestateError, UI_ERROR_CODES } from '@restate/util-errors';
import {
  isInvocationNotFound,
  walkInvocationAncestors,
} from './invocationAncestors';

function invocation(id: string, parent?: string) {
  return { id, invoked_by_id: parent } as Invocation;
}

const invocations = new Map(
  [
    invocation('inv_root'),
    invocation('inv_a', 'inv_root'),
    invocation('inv_b', 'inv_a'),
    invocation('inv_c', 'inv_b'),
  ].map((inv) => [inv.id, inv]),
);

const getInvocation = async (id: string) => invocations.get(id);

describe('walkInvocationAncestors', () => {
  it('walks from the parent up to the root', async () => {
    const ancestors = await walkInvocationAncestors('inv_c', getInvocation);

    expect(ancestors.map(({ id }) => id)).toEqual([
      'inv_c',
      'inv_b',
      'inv_a',
      'inv_root',
    ]);
  });

  it('stops where an ancestor can no longer be found', async () => {
    const ancestors = await walkInvocationAncestors('inv_c', async (id) =>
      id === 'inv_a' ? undefined : invocations.get(id),
    );

    expect(ancestors.map(({ id }) => id)).toEqual(['inv_c', 'inv_b']);
  });

  it('stops after the maximum number of ancestors', async () => {
    const ancestors = await walkInvocationAncestors('inv_c', getInvocation, 2);

    expect(ancestors.map(({ id }) => id)).toEqual(['inv_c', 'inv_b']);
  });

  it('stops on a cycle', async () => {
    const cycle = new Map([
      ['inv_x', invocation('inv_x', 'inv_y')],
      ['inv_y', invocation('inv_y', 'inv_x')],
    ]);
    const ancestors = await walkInvocationAncestors('inv_x', async (id) =>
      cycle.get(id),
    );

    expect(ancestors.map(({ id }) => id)).toEqual(['inv_x', 'inv_y']);
  });

  it('fails when looking up an ancestor fails', async () => {
    await expect(
      walkInvocationAncestors('inv_c', async () => {
        throw new Error('503');
      }),
    ).rejects.toThrow('503');
  });
});

describe('isInvocationNotFound', () => {
  it('recognises the not-found code and a 404', () => {
    expect(
      isInvocationNotFound(
        new RestateError('gone', UI_ERROR_CODES.invocationNotFound),
      ),
    ).toBe(true);
    expect(
      isInvocationNotFound(
        new RestateError('gone', undefined, undefined, undefined, 404),
      ),
    ).toBe(true);
  });

  it('treats other failures as errors', () => {
    expect(
      isInvocationNotFound(
        new RestateError('down', undefined, undefined, undefined, 503),
      ),
    ).toBe(false);
    expect(isInvocationNotFound(new Error('network'))).toBe(false);
  });
});
