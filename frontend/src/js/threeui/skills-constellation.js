import { createContext, createProgram, createBuffer, createTicker, createViewportGate, bindContextLoss, resetAttributes, bindAttribute } from './gl.js';
import { readPalette, onThemeChange } from './palette.js';
import { getCapabilities, onReducedMotionChange } from './capabilities.js';

const CAM_Z = 3.4;
const FOCAL = 1 / Math.tan((40 * Math.PI) / 180 / 2);
const PROXIMITY = 0.62;
const NODE_RADIUS = 1.15;
const SPHERE_MARGIN = 0.94;
const NODE_STRIDE = 10;
const EDGE_STRIDE = 7;
const NODE_VERTICES = 6;

const NODE_VERTEX_SOURCE = `
attribute vec3 aPos;
attribute vec2 aCorner;
attribute float aSize;
attribute float aMix;
attribute float aAlpha;
attribute float aIndex;
attribute float aVisible;

uniform float uRotX;
uniform float uRotY;
uniform float uRotZ;
uniform float uCamZ;
uniform float uFocal;
uniform float uAspect;
uniform float uFit;
uniform float uPixelsPerUnit;
uniform float uHalfHeight;
uniform float uActive;
uniform float uActiveStrength;

varying float vMix;
varying float vAlpha;
varying float vActive;
varying vec2 vLocal;

void main() {
  float cy = cos(uRotY), sy = sin(uRotY);
  vec3 p = vec3(aPos.x * cy + aPos.z * sy, aPos.y, -aPos.x * sy + aPos.z * cy);

  float cx = cos(uRotX), sx = sin(uRotX);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);

  float cz = cos(uRotZ), sz = sin(uRotZ);
  p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z);

  float persp = uFocal / (uCamZ - p.z);
  vec2 ndc = vec2(p.x * persp * uFit / uAspect, p.y * persp * uFit);
  float radius = aSize * uPixelsPerUnit * (1.0 + step(abs(aIndex - uActive), 0.5) * uActiveStrength * 1.5);
  ndc += aCorner * radius / max(1.0, uHalfHeight);
  gl_Position = vec4(ndc, 0.0, 1.0);

  vLocal = aCorner;
  vActive = step(abs(aIndex - uActive), 0.5) * uActiveStrength;
  vMix = aMix;
  vAlpha = aAlpha * aVisible * (1.0 + vActive * 0.85);
}
`;

const NODE_FRAGMENT_SOURCE = `
precision mediump float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorHot;

varying float vMix;
varying float vAlpha;
varying float vActive;
varying vec2 vLocal;

void main() {
  float d = length(vLocal);
  float body = smoothstep(1.0, 0.18, d);
  if (body <= 0.003 || vAlpha <= 0.003) discard;
  float core = smoothstep(0.44, 0.0, d);
  vec3 tint = mix(mix(uColorA, uColorB, vMix), uColorHot, vActive);
  gl_FragColor = vec4(tint * (1.0 + core * 0.75), vAlpha * mix(body, 1.0, core * 0.35));
}
`;

const EDGE_VERTEX_SOURCE = `
attribute vec3 aPos;
attribute float aA;
attribute float aB;
attribute float aAlpha;
attribute float aVisible;

uniform float uRotX;
uniform float uRotY;
uniform float uRotZ;
uniform float uCamZ;
uniform float uFocal;
uniform float uAspect;
uniform float uFit;
uniform float uActive;
uniform float uActiveStrength;

varying float vHot;
varying float vAlpha;

void main() {
  float cy = cos(uRotY), sy = sin(uRotY);
  vec3 p = vec3(aPos.x * cy + aPos.z * sy, aPos.y, -aPos.x * sy + aPos.z * cy);

  float cx = cos(uRotX), sx = sin(uRotX);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);

  float cz = cos(uRotZ), sz = sin(uRotZ);
  p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, p.z);

  float persp = uFocal / (uCamZ - p.z);
  gl_Position = vec4(p.x * persp * uFit / uAspect, p.y * persp * uFit, 0.0, 1.0);

  vHot = clamp(step(abs(aA - uActive), 0.5) + step(abs(aB - uActive), 0.5), 0.0, 1.0) * uActiveStrength;
  vAlpha = aAlpha * aVisible * (1.0 + vHot * 2.2);
}
`;

const EDGE_FRAGMENT_SOURCE = `
precision mediump float;

uniform vec3 uColorEdge;
uniform vec3 uColorHot;

varying float vHot;
varying float vAlpha;

void main() {
  gl_FragColor = vec4(mix(uColorEdge, uColorHot, vHot * 0.85), vAlpha);
}
`;

const NODE_CORNERS = new Float32Array([
  -1, -1, 1, -1, 1, 1,
  -1, -1, 1, 1, -1, 1
]);

const NODE_ATTRIBUTES = {
  stride: NODE_STRIDE,
  map: [
    ['aPos', 3, 0],
    ['aCorner', 2, 3],
    ['aSize', 1, 5],
    ['aMix', 1, 6],
    ['aAlpha', 1, 7],
    ['aIndex', 1, 8],
    ['aVisible', 1, 9]
  ]
};

const EDGE_ATTRIBUTES = {
  stride: EDGE_STRIDE,
  map: [
    ['aPos', 3, 0],
    ['aA', 1, 3],
    ['aB', 1, 4],
    ['aAlpha', 1, 5]
  ]
};

function fibonacciSphere(count) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    points.push({
      x: Math.cos(theta) * Math.sin(phi) * NODE_RADIUS,
      y: Math.sin(theta) * Math.sin(phi) * NODE_RADIUS,
      z: Math.cos(phi) * NODE_RADIUS
    });
  }
  return points;
}

function computeFit(aspect) {
  return Math.min(1, aspect) * (SPHERE_MARGIN / NODE_RADIUS);
}

function projectNode(node, rotX, rotY, rotZ) {
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  const px = node.x * cy + node.z * sy;
  let py = node.y;
  let pz = -node.x * sy + node.z * cy;
  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const ty = py * cx - pz * sx;
  const tz = py * sx + pz * cx;
  py = ty;
  pz = tz;
  const cz = Math.cos(rotZ);
  const sz = Math.sin(rotZ);
  return { x: px * cz - py * sz, y: px * sz + py * cz, z: pz };
}

function readGroups(grid) {
  const groups = [];
  Array.from(grid.querySelectorAll('.skill-card')).forEach((card) => {
    const title = card.querySelector('.skill-card-title');
    const tiles = Array.from(card.querySelectorAll('.skill-tile'));
    if (!tiles.length) return;
    groups.push({
      name: title ? title.textContent.trim() : '',
      index: groups.length,
      filtered: card.classList.contains('is-filtered'),
      tiles: tiles.map((tile) => {
        const label = tile.querySelector('.skill-tile-name');
        return { element: tile, name: label ? label.textContent.trim() : '' };
      })
    });
  });
  return groups;
}

export function createSkillsConstellation(host, grid) {
  const caps = getCapabilities();
  if (!caps.webgl || !host || !grid) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'constellation-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const label = document.createElement('span');
  label.className = 'constellation-label';
  label.setAttribute('aria-hidden', 'true');
  label.innerHTML =
    '<span class="constellation-label-name" data-role="name"></span>' +
    '<span class="constellation-label-group" data-role="group"></span>';
  host.appendChild(label);
  const labelName = label.querySelector('[data-role="name"]');
  const labelGroup = label.querySelector('[data-role="group"]');

  const gl = createContext(canvas);
  if (!gl) {
    host.removeChild(canvas);
    host.removeChild(label);
    return null;
  }

  let nodeProgram;
  let edgeProgram;
  try {
    nodeProgram = createProgram(gl, NODE_VERTEX_SOURCE, NODE_FRAGMENT_SOURCE);
    edgeProgram = createProgram(gl, EDGE_VERTEX_SOURCE, EDGE_FRAGMENT_SOURCE);
  } catch (error) {
    console.warn('[fx] constellation shader unavailable:', error.message);
    host.removeChild(canvas);
    host.removeChild(label);
    return null;
  }

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  let palette = readPalette();
  let nodes = [];
  let edges = [];
  let nodeData = null;
  let edgeData = null;
  let nodeBuffer = null;
  let edgeBuffer = null;
  let nodeCount = 0;
  let edgeVertexCount = 0;
  let built = false;
  let width = 0;
  let height = 0;
  let rectWidth = 0;
  let rectHeight = 0;
  let pixelsPerUnit = 100;
  let fit = 0.8;
  let elapsed = 0;
  let activeIndex = -1;
  let activeStrength = 0;
  let targetActive = -1;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let reduced = caps.reducedMotion;
  let onScreen = false;
  let contextLost = false;
  let lastLabelX = -9999;
  let lastLabelY = -9999;

  const applySize = () => {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    rectWidth = rect.width;
    rectHeight = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, caps.budget.dpr);
    const nextWidth = Math.round(rect.width * dpr);
    const nextHeight = Math.round(rect.height * dpr);
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    fit = computeFit(width / Math.max(1, height));
    pixelsPerUnit = (height * 0.5 * SPHERE_MARGIN) / NODE_RADIUS;
  };

  const bindAttributes = (program, buffer, spec) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    resetAttributes(gl);
    const stride = spec.stride * 4;
    spec.map.forEach(([name, size, offset]) => {
      bindAttribute(gl, program, name, size, stride, offset * 4);
    });
  };

  const upload = (buffer, data) => {
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  };

  const updateLabel = (rotX, rotY, rotZ) => {
    if (activeIndex < 0 || !nodes[activeIndex]) {
      if (label.classList.contains('is-visible')) label.classList.remove('is-visible');
      lastLabelX = -9999;
      return;
    }
    const point = projectNode(nodes[activeIndex], rotX, rotY, rotZ);
    const aspect = width / Math.max(1, height);
    const persp = FOCAL / Math.max(0.2, CAM_Z - point.z);
    const scale = computeFit(aspect);
    const clipX = point.x * persp * scale / aspect;
    const clipY = point.y * persp * scale;
    const screenX = (clipX * 0.5 + 0.5) * rectWidth;
    const screenY = (1 - (clipY * 0.5 + 0.5)) * rectHeight;
    if (Math.abs(screenX - lastLabelX) < 0.75 && Math.abs(screenY - lastLabelY) < 0.75) return;
    lastLabelX = screenX;
    lastLabelY = screenY;
    label.style.transform = 'translate3d(' + screenX.toFixed(1) + 'px,' + screenY.toFixed(1) + 'px, 0)';
  };

  const isStale = () => {
    if (!built) return false;
    const current = Array.from(grid.querySelectorAll('.skill-tile'));
    if (current.length < nodes.length) return true;
    for (let index = 0; index < nodes.length; index += 1) {
      if (current[index] !== nodes[index].element) return true;
    }
    return false;
  };

  const reset = () => {
    nodes.forEach((node) => {
      if (!node.show) return;
      node.element.removeEventListener('pointerenter', node.show);
      node.element.removeEventListener('pointerleave', node.hide);
    });
    if (nodeBuffer) gl.deleteBuffer(nodeBuffer);
    if (edgeBuffer) gl.deleteBuffer(edgeBuffer);
    nodeBuffer = null;
    edgeBuffer = null;
    nodes = [];
    edges = [];
    nodeData = null;
    edgeData = null;
    nodeCount = 0;
    edgeVertexCount = 0;
    built = false;
    activeIndex = -1;
    targetActive = -1;
    activeStrength = 0;
    label.classList.remove('is-visible');
    lastLabelX = -9999;
  };

  const build = () => {
    if (built) return true;
    const groups = readGroups(grid);
    if (!groups.length) return false;

    const flattened = [];
    groups.forEach((group) => {
      group.tiles.forEach((tile) => {
        flattened.push({ name: tile.name, element: tile.element, group });
      });
    });
    if (!flattened.length) return false;

    const capped = flattened.slice(0, caps.budget.nodeCap);
    const positions = fibonacciSphere(capped.length);
    const span = Math.max(1, groups.length - 1);

    nodes = capped.map((entry, index) => ({
      ...entry,
      x: positions[index].x,
      y: positions[index].y,
      z: positions[index].z,
      size: 0.016 + (index % 7) * 0.0026,
      speed: 0.35 + ((index * 37) % 11) * 0.045,
      offset: ((index * 53) % 17) * 0.37,
      mix: entry.group.index / span,
      visible: !entry.group.filtered,
      alpha: 0.62 + ((index * 29) % 9) * 0.045,
      show: null,
      hide: null
    }));

    const pairs = new Map();
    for (let a = 0; a < nodes.length; a += 1) {
      for (let b = a + 1; b < nodes.length; b += 1) {
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        const dz = nodes[a].z - nodes[b].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const sameGroup = nodes[a].group.index === nodes[b].group.index;
        if (distance >= PROXIMITY && !sameGroup) continue;
        const proximity = Math.max(0, 1 - distance / PROXIMITY);
        const strength = sameGroup ? Math.max(0.35, 1 - distance / 2) : proximity;
        pairs.set(a + ':' + b, { a, b, strength: Math.min(1, Math.max(0.1, strength)) });
      }
    }
    edges = Array.from(pairs.values());

    nodeData = new Float32Array(nodes.length * NODE_STRIDE);
    edgeData = new Float32Array(edges.length * 2 * EDGE_STRIDE);

    nodes.forEach((node, index) => {
      for (let v = 0; v < NODE_VERTICES; v += 1) {
        const offset = (index * NODE_VERTICES + v) * NODE_STRIDE;
        nodeData[offset] = node.x;
        nodeData[offset + 1] = node.y;
        nodeData[offset + 2] = node.z;
        nodeData[offset + 3] = NODE_CORNERS[v * 2];
        nodeData[offset + 4] = NODE_CORNERS[v * 2 + 1];
        nodeData[offset + 5] = node.size;
        nodeData[offset + 6] = node.mix;
        nodeData[offset + 7] = node.alpha;
        nodeData[offset + 8] = index;
        nodeData[offset + 9] = node.visible ? 1 : 0;
      }
    });

    edges.forEach((edge, index) => {
      for (let end = 0; end < 2; end += 1) {
        const node = nodes[end === 0 ? edge.a : edge.b];
        const offset = (index * 2 + end) * EDGE_STRIDE;
        edgeData[offset] = node.x;
        edgeData[offset + 1] = node.y;
        edgeData[offset + 2] = node.z;
        edgeData[offset + 3] = edge.a;
        edgeData[offset + 4] = edge.b;
        edgeData[offset + 5] = 0.07 + edge.strength * 0.3;
        edgeData[offset + 6] = 1;
      }
    });

    nodeCount = nodes.length;
    edgeVertexCount = edges.length * 2;
    nodeBuffer = createBuffer(gl, nodeData, gl.DYNAMIC_DRAW);
    edgeBuffer = createBuffer(gl, edgeData, gl.DYNAMIC_DRAW);
    built = true;

    nodes.forEach((node, index) => {
      node.show = () => {
        targetActive = index;
        labelName.textContent = node.name;
        labelGroup.textContent = node.group.name;
        label.classList.add('is-visible');
      };
      node.hide = () => {
        targetActive = -1;
      };
      node.element.addEventListener('pointerenter', node.show, { passive: true });
      node.element.addEventListener('pointerleave', node.hide, { passive: true });
    });

    return true;
  };

  const syncFilter = () => {
    if (!built) return;
    const state = new Map();
    readGroups(grid).forEach((group) => state.set(group.name, !group.filtered));
    nodes.forEach((node, index) => {
      const visible = state.has(node.group.name) ? state.get(node.group.name) : node.visible;
      node.visible = visible;
    });
    edges.forEach((edge, index) => {
      const visible = nodes[edge.a].visible && nodes[edge.b].visible ? 1 : 0;
      edgeData[index * 2 * EDGE_STRIDE + 6] = visible;
      edgeData[(index * 2 + 1) * EDGE_STRIDE + 6] = visible;
    });
    upload(nodeBuffer, nodeData);
    upload(edgeBuffer, edgeData);
    draw();
  };

  const draw = () => {
    if (!built || !width || !height) return;
    const rotY = elapsed * 0.05 + pointerX * 0.3;
    const rotX = 0.2 + pointerY * 0.18 + Math.sin(elapsed * 0.14) * 0.1;
    const rotZ = elapsed * 0.018;

    for (let index = 0; index < nodeCount; index += 1) {
      const node = nodes[index];
      const pulse = (Math.sin(elapsed * node.speed + node.offset) + 1) / 2;
      const size = node.size + pulse * 0.009;
      const alpha = node.alpha * (0.4 + pulse * 0.6);
      for (let v = 0; v < NODE_VERTICES; v += 1) {
        const offset = (index * NODE_VERTICES + v) * NODE_STRIDE;
        nodeData[offset + 5] = size;
        nodeData[offset + 7] = alpha;
      }
    }
    upload(nodeBuffer, nodeData);
    upload(edgeBuffer, edgeData);

    const aspect = width / Math.max(1, height);

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Additive glow only reads on dark surfaces. On the light theme the same
    // colours disappear into a near-white background, so fall back to
    // source-over compositing where the darker palette actually shows.
    gl.blendFunc(gl.SRC_ALPHA, palette.isLight ? gl.ONE_MINUS_SRC_ALPHA : gl.ONE);

    edgeProgram.use();
    bindAttributes(edgeProgram, edgeBuffer, EDGE_ATTRIBUTES);
    edgeProgram.set1f('uRotX', rotX);
    edgeProgram.set1f('uRotY', rotY);
    edgeProgram.set1f('uRotZ', rotZ);
    edgeProgram.set1f('uCamZ', CAM_Z);
    edgeProgram.set1f('uFocal', FOCAL);
    edgeProgram.set1f('uAspect', aspect);
    edgeProgram.set1f('uFit', fit);
    edgeProgram.set1f('uActive', targetActive);
    edgeProgram.set1f('uActiveStrength', activeStrength);
    edgeProgram.set3f('uColorEdge', palette.edge);
    edgeProgram.set3f('uColorHot', palette.nodeHot);
    gl.drawArrays(gl.LINES, 0, edgeVertexCount);

    nodeProgram.use();
    bindAttributes(nodeProgram, nodeBuffer, NODE_ATTRIBUTES);
    nodeProgram.set1f('uRotX', rotX);
    nodeProgram.set1f('uRotY', rotY);
    nodeProgram.set1f('uRotZ', rotZ);
    nodeProgram.set1f('uCamZ', CAM_Z);
    nodeProgram.set1f('uFocal', FOCAL);
    nodeProgram.set1f('uAspect', aspect);
    nodeProgram.set1f('uFit', fit);
    nodeProgram.set1f('uPixelsPerUnit', pixelsPerUnit);
    nodeProgram.set1f('uHalfHeight', height * 0.5);
    nodeProgram.set1f('uActive', targetActive);
    nodeProgram.set1f('uActiveStrength', activeStrength);
    nodeProgram.set3f('uColorA', palette.fieldStart);
    nodeProgram.set3f('uColorB', palette.fieldEnd);
    nodeProgram.set3f('uColorHot', palette.nodeHot);
    gl.drawArrays(gl.TRIANGLES, 0, nodeCount * NODE_VERTICES);

    updateLabel(rotX, rotY, rotZ);
  };

  const ticker = createTicker((delta) => {
    if (reduced || contextLost || !built) return;
    elapsed += delta;
    pointerX += (targetPointerX - pointerX) * 0.05;
    pointerY += (targetPointerY - pointerY) * 0.05;
    activeStrength += ((targetActive >= 0 ? 1 : 0) - activeStrength) * 0.14;
    if (targetActive < 0 && activeStrength < 0.02) activeStrength = 0;
    activeIndex = activeStrength > 0.02 ? targetActive : -1;
    draw();
  }, caps.budget.frameInterval);

  const syncMotion = () => {
    if (reduced) {
      ticker.stop();
      activeStrength = targetActive >= 0 ? 1 : 0;
      activeIndex = targetActive;
      draw();
      return;
    }
    if (onScreen && !contextLost && built) ticker.start();
    else ticker.stop();
  };

  const gridObserver = new MutationObserver(() => {
    if (isStale()) reset();
    if (!build()) return;
    syncFilter();
    syncMotion();
  });
  gridObserver.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  const resizeObserver = new ResizeObserver(applySize);
  resizeObserver.observe(host);
  applySize();

  const gate = createViewportGate(host, (active) => {
    onScreen = active;
    if (!active) return;
    if (isStale()) reset();
    if (build()) syncFilter();
    syncMotion();
  }, '240px');

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
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetPointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetPointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    host.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  build();
  applySize();
  draw();
  host.classList.add('fx-ready');
  if (reduced) host.classList.add('fx-static');

  return {
    get stats() {
      return { built, nodes: nodeCount, edges: edges.length };
    },
    destroy() {
      if (onPointerMove) host.removeEventListener('pointermove', onPointerMove);
      gridObserver.disconnect();
      unwatchMotion();
      unwatchTheme();
      unwatchLoss();
      gate.destroy();
      resizeObserver.disconnect();
      ticker.stop();
      nodes.forEach((node) => {
        if (!node.show) return;
        node.element.removeEventListener('pointerenter', node.show);
        node.element.removeEventListener('pointerleave', node.hide);
      });
      if (nodeBuffer) gl.deleteBuffer(nodeBuffer);
      if (edgeBuffer) gl.deleteBuffer(edgeBuffer);
      nodeProgram.dispose();
      edgeProgram.dispose();
      host.classList.remove('fx-ready', 'fx-static');
      if (canvas.parentNode) host.removeChild(canvas);
      if (label.parentNode) host.removeChild(label);
    }
  };
}
