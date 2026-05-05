import '@testing-library/jest-dom/matchers';

if (!globalThis.CSS) {
  Object.defineProperty(globalThis, 'CSS', {
    value: {},
    configurable: true,
  });
}

globalThis.CSS.escape = (value) => String(value);

if (!HTMLElement.prototype.getAnimations) {
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    value: () => [],
    configurable: true,
  });
}
