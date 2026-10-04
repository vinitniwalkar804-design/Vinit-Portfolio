import { createContext, createProgram, createBuffer, createTicker, createViewportGate, bindContextLoss, resetAttributes, bindAttribute } from './gl.js';
import { readPalette, onThemeChange } from './palette.js';
import { getCapabilities, onReducedMotionChange } from './capabilities.js';

const VERTEX_SOURCE = `
attribute vec2 aPos;
attribute float aMix;
attribute float aSeed;
attribute float aT;

uniform float uTime;
uniform float uScale;
uniform float uAlpha;
uniform vec2 uHalf;
uniform float uRotX;
uniform float uRotY;
uniform float uRotZ;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float x = aPos.x;
  float y = aPos.y;
  float t = uTime * 0.4;

  float wave = sin(y * 1.2 + t + x * 0.8) * 0.8 + cos(x * 1.5 - t * 0.8 + y * 0.5) * 0.6;
  vec3 p = vec3(x, y, wave);

  float cx = cos(uRotX), sx = sin(uRotX);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);

  float cy = cos(uRotY), sy = sin(uRotY);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);

  float cz = cos(uRotZ), sz = sin(uRotZ);
  p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z);

  float persp = 1.0 / (1.0 - p.z * 0.021);
  gl_Position = vec4(p.xy * uScale * persp, 0.0, 1.0);

  float radial = 1.0 - smoothstep(0.34, 1.0, length(vec2(x / uHalf.x, y / uHalf.y)));
  float along = smoothstep(0.0, 0.12, aT) * (1.0 - smoothstep(0.62, 1.0, aT));

  vColor = mix(uColorA, uColorB, aMix);
  vAlpha = uAlpha * (0.42 + aSeed * 0.82) * radial * along;
}
`;

const FRAGMENT_SOURCE = `
precision mediump float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(vColor, vAlpha);
}
`;

const SPACING_X = 0.22;
const SPACING_Y = 0.2;
const BASE_ROT_X = Math.PI / 3;
const BASE_ROT_Z = -Math.PI / 8;

function buildGeometry(lines, points) {
  const segments = points - 1;
  const vertexCount = lines * segments * 2;
  const data = new Float32Array(vertexCount * 5);
  const halfX = (lines * SPACING_X) / 2;
  const halfY = (points * SPACING_Y) / 2;
  let offset = 0;

  for (let i = 0; i < lines; i += 1) {
    const x = (i - lines / 2) * SPACING_X;
    const mix = lines > 1 ? i / (lines - 1) : 0.5;
    const seed = Math.random();
    for (let s = 0; s < segments; s += 1) {
      const first = s / (points - 1);
      const second = (s + 1) / (points - 1);
      data[offset] = x;
      data[offset + 1] = (s - segments / 2) * SPACING_Y;
      data[offset + 2] = mix;
      data[offset + 3] = seed;
      data[offset + 4] = first;
      data[offset + 5] = x;
      data[offset + 6] = (s + 1 - segments / 2) * SPACING_Y;
      data[offset + 7] = mix;
      data[offset + 8] = seed;
      data[offset + 9] = second;
      offset += 10;
    }
  }

  return { data, halfX, halfY };
}

export function createHeroField(host) {
  const caps = getCapabilities();
  if (!caps.webgl || !host) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const gl = createContext(canvas);
  if (!gl) {
    host.removeChild(canvas);
    return null;
  }

  let program;
  try {
    program = createProgram(gl, VERTEX_SOURCE, FRAGMENT_SOURCE);
  } catch (error) {
    console.warn('[fx] hero field shader unavailable:', error.message);
    host.removeChild(canvas);
    return null;
  }

  const lines = caps.budget.fieldLines;
  const points = caps.budget.fieldPoints;
  const geometry = buildGeometry(lines, points);
  const buffer = createBuffer(gl, geometry.data);

  const bind = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    resetAttributes(gl);
    const stride = 5 * 4;
    bindAttribute(gl, program, 'aPos', 2, stride, 0);
    bindAttribute(gl, program, 'aMix', 1, stride, 8);
    bindAttribute(gl, program, 'aSeed', 1, stride, 12);
    bindAttribute(gl, program, 'aT', 1, stride, 16);
  };

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  let palette = readPalette();
  let width = 0;
  let height = 0;
  let scale = 1;
  let alpha = host.classList.contains('hero-field--strong') ? 0.3 : 0.2;
  let elapsed = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let reduced = caps.reducedMotion;
  let onScreen = false;
  let running = false;
  let contextLost = false;

  const applySize = () => {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, caps.budget.dpr);
    const nextWidth = Math.round(rect.width * dpr);
    const nextHeight = Math.round(rect.height * dpr);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    scale = Math.min((rect.width * 0.5) / 9.0, (rect.height * 0.5) / 7.2);
  };

  const draw = () => {
    if (!width || !height) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    program.use();
    bind();
    program.set1f('uTime', elapsed);
    program.set1f('uScale', scale);
    program.set1f('uAlpha', alpha);
    program.set2f('uHalf', geometry.halfX, geometry.halfY);
    program.set1f('uRotX', BASE_ROT_X + pointerY * 0.2 + Math.sin(elapsed * 0.13) * 0.05);
    program.set1f('uRotY', Math.sin(elapsed * 0.07) * 0.4 + pointerX * 0.3);
    program.set1f('uRotZ', BASE_ROT_Z + pointerX * 0.1);
    program.set3f('uColorA', palette.fieldStart);
    program.set3f('uColorB', palette.fieldEnd);
    gl.drawArrays(gl.LINES, 0, geometry.data.length / 5);
  };

  const ticker = createTicker((delta) => {
    if (reduced || contextLost) return;
    elapsed += delta;
    pointerX += (targetX - pointerX) * 0.045;
    pointerY += (targetY - pointerY) * 0.045;
    draw();
  }, caps.budget.frameInterval);

  const syncMotion = () => {
    if (reduced) {
      ticker.stop();
      pointerX = 0;
      pointerY = 0;
      elapsed = 0;
      draw();
      return;
    }
    if (onScreen && !contextLost) ticker.start();
    else ticker.stop();
  };

  const resizeObserver = new ResizeObserver(applySize);
  resizeObserver.observe(host);
  applySize();
  draw();

  const gate = createViewportGate(host, (active) => {
    onScreen = active;
    syncMotion();
  }, '200px');

  const unwatchMotion = onReducedMotionChange((value) => {
    reduced = value;
    host.classList.toggle('fx-static', value);
    syncMotion();
  });

  const unwatchTheme = onThemeChange((next) => {
    palette = next;
    draw();
  });

  const unwatchLoss = bindContextLoss(canvas, gl, () => {
    contextLost = true;
    ticker.stop();
  });

  let onPointerMove = null;
  if (caps.budget.parallax) {
    onPointerMove = (event) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  host.classList.add('fx-ready');
  if (reduced) host.classList.add('fx-static');

  return {
    destroy() {
      if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
      unwatchMotion();
      unwatchTheme();
      unwatchLoss();
      gate.destroy();
      resizeObserver.disconnect();
      ticker.stop();
      gl.deleteBuffer(buffer);
      program.dispose();
      host.classList.remove('fx-ready', 'fx-static');
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}
