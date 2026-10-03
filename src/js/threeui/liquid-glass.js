const TARGETS = ['.hero-actions .btn', '.github-links .btn', '#contactSubmit'];

function supportsBackdropBlur() {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('backdrop-filter', 'blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'blur(2px)');
}

export function applyLiquidGlass(root) {
  const scope = root || document;
  const elements = [];
  TARGETS.forEach((selector) => {
    Array.from(scope.querySelectorAll(selector)).forEach((element) => {
      if (elements.indexOf(element) === -1) elements.push(element);
    });
  });

  if (!elements.length) return { count: 0, destroy() {} };

  const blur = supportsBackdropBlur();
  elements.forEach((element) => {
    element.classList.add('fx-glass');
    if (blur) element.classList.add('fx-glass-blur');
  });

  return {
    count: elements.length,
    destroy() {
      elements.forEach((element) => element.classList.remove('fx-glass', 'fx-glass-blur'));
    }
  };
}
