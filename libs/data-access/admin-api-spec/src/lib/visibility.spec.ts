import { isPublicHandler, isPublicService } from './visibility.js';

describe('isPublicHandler', () => {
  it('follows the handler when the service is public', () => {
    expect(isPublicHandler({ public: true }, { public: true })).toBe(true);
    expect(isPublicHandler({ public: true }, { public: false })).toBe(false);
  });

  it('is private when the service is private', () => {
    expect(isPublicHandler({ public: false }, { public: true })).toBe(false);
    expect(isPublicHandler({ public: false }, {})).toBe(false);
  });

  it('treats a missing flag as public', () => {
    expect(isPublicHandler(undefined, {})).toBe(true);
    expect(isPublicHandler({}, { public: null })).toBe(true);
  });
});

describe('isPublicService', () => {
  it('is public while the service is unknown', () => {
    expect(isPublicService(undefined)).toBe(true);
  });

  it('is private when the service is private', () => {
    expect(
      isPublicService({ public: false, handlers: [{ public: true }] }),
    ).toBe(false);
    expect(isPublicService({ public: false })).toBe(false);
  });

  it('is private when every handler is private', () => {
    expect(
      isPublicService({
        public: true,
        handlers: [{ public: false }, { public: false }],
      }),
    ).toBe(false);
  });

  it('is public when at least one handler is public', () => {
    expect(
      isPublicService({
        public: true,
        handlers: [{ public: false }, { public: true }],
      }),
    ).toBe(true);
  });

  it('falls back to the service flag while handlers are unknown', () => {
    expect(isPublicService({ public: true })).toBe(true);
    expect(isPublicService({ public: true, handlers: [] })).toBe(true);
  });
});
