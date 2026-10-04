const TIER_BUDGETS = {
  high: { fieldLines: 60, fieldPoints: 100, nodeCap: 120, dpr: 1.75, parallax: true, frameInterval: 0 },
  medium: { fieldLines: 44, fieldPoints: 80, nodeCap: 90, dpr: 1.5, parallax: true, frameInterval: 0 },
  low: { fieldLines: 26, fieldPoints: 52, nodeCap: 56, dpr: 1.25, parallax: false, frameInterval: 1 / 40 }
};

const SOFTWARE_BUDGET = { fieldLines: 22, fieldPoints: 44, nodeCap: 40, dpr: 0.85, parallax: false, frameInterval: 1 / 30 };

const SOFTWARE_HINTS = ['swiftshader', 'llvmpipe', 'software', 'basic render', 'microsoft basic'];

function detectTier(software) {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 620;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const modestRam = typeof memory === 'number' && memory <= 4;
  if (software || coarse || smallViewport || cores <= 4 || modestRam) return 'low';
  if (cores <= 8) return 'medium';
  return 'high';
}

function probeWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { webgl: false, renderer: '' };
    let renderer = '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext && typeof gl.getParameter === 'function') {
      const raw = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof raw === 'string') renderer = raw;
    }
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return { webgl: true, renderer };
  } catch (error) {
    return { webgl: false, renderer: '' };
  }
}

let cache = null;

export function getCapabilities(force) {
  if (cache && !force) return cache;
  const probe = probeWebGL();
  const renderer = probe.renderer;
  const software = probe.webgl && SOFTWARE_HINTS.some((hint) => renderer.toLowerCase().indexOf(hint) !== -1);
  const tier = detectTier(software);
  cache = {
    webgl: probe.webgl,
    tier,
    budget: software ? SOFTWARE_BUDGET : TIER_BUDGETS[tier],
    software,
    renderer,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    finePointer: window.matchMedia('(hover: hover) and (pointer: fine)').matches
  };
  return cache;
}

export function onReducedMotionChange(handler) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = (event) => handler(event.matches);
  if (typeof query.addEventListener === 'function') query.addEventListener('change', listener);
  else query.addListener(listener);
  return () => {
    if (typeof query.removeEventListener === 'function') query.removeEventListener('change', listener);
    else query.removeListener(listener);
  };
}
