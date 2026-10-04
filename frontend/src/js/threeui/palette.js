const FALLBACK = {
  fieldStart: [99, 102, 241],
  fieldEnd: [34, 211, 238],
  node: [176, 177, 196],
  nodeHot: [34, 211, 238],
  edge: [99, 102, 241]
};

function readColor(styles, name, fallback) {
  const raw = styles.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const parts = raw.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return fallback;
  return [
    Math.min(255, Number(parts[0])) / 255,
    Math.min(255, Number(parts[1])) / 255,
    Math.min(255, Number(parts[2])) / 255
  ];
}

export function readPalette() {
  const styles = getComputedStyle(document.documentElement);
  return {
    isLight: document.documentElement.getAttribute('data-theme') === 'light',
    fieldStart: readColor(styles, '--fx-field-start', FALLBACK.fieldStart),
    fieldEnd: readColor(styles, '--fx-field-end', FALLBACK.fieldEnd),
    node: readColor(styles, '--fx-node', FALLBACK.node),
    nodeHot: readColor(styles, '--fx-node-hot', FALLBACK.nodeHot),
    edge: readColor(styles, '--fx-edge', FALLBACK.edge)
  };
}

export function onThemeChange(handler) {
  const observer = new MutationObserver(() => handler(readPalette()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
