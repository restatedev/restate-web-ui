import {
  getSessionObjectStateKeyPrefix,
  isSessionObject,
  type SessionObjectService,
} from './sessionObjects';

const sessionObject: SessionObjectService = {
  ty: 'VirtualObject',
  metadata: {
    'dev.restate.tooling.journal.hidden.names': 'sync',
    'dev.restate.tooling.journal.hidden.name.prefix': 'v22/',
  },
};

describe('isSessionObject', () => {
  it('recognises a Virtual Object that declares the sessions SDK state prefix', () => {
    expect(isSessionObject(sessionObject)).toBe(true);
    expect(getSessionObjectStateKeyPrefix(sessionObject)).toBe('v22/');
  });

  it('ignores the same metadata on other service types', () => {
    expect(isSessionObject({ ...sessionObject, ty: 'Service' })).toBe(false);
    expect(isSessionObject({ ...sessionObject, ty: 'Workflow' })).toBe(false);
  });

  it('ignores Virtual Objects that hide other journal entries', () => {
    expect(isSessionObject({ ty: 'VirtualObject' })).toBe(false);
    expect(
      isSessionObject({
        ty: 'VirtualObject',
        metadata: {
          'dev.restate.tooling.journal.hidden.names': 'sync',
          'dev.restate.tooling.journal.hidden.name.prefix': 'cache/',
        },
      }),
    ).toBe(false);
    expect(getSessionObjectStateKeyPrefix(undefined)).toBeUndefined();
  });
});
