globalThis.ResizeObserver ??= class {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
};

window.matchMedia ??= (media) => ({
  media,
  matches: false,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
});

Element.prototype.scrollBy ??= () => undefined;
Element.prototype.animate ??= () => ({}) as Animation;
HTMLCanvasElement.prototype.getContext = () => null;
