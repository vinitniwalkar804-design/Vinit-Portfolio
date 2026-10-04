export function createContext(canvas) {
  const attributes = {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  };
  try {
    return canvas.getContext('webgl', attributes) || canvas.getContext('experimental-webgl', attributes);
  } catch (error) {
    return null;
  }
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to allocate shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile failed: ' + log);
  }
  return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const handle = gl.createProgram();
  gl.attachShader(handle, vertex);
  gl.attachShader(handle, fragment);
  gl.linkProgram(handle);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(handle);
    gl.deleteProgram(handle);
    throw new Error('Program link failed: ' + log);
  }

  const locations = new Map();
  const attribute = (name) => {
    if (!locations.has('a:' + name)) locations.set('a:' + name, gl.getAttribLocation(handle, name));
    return locations.get('a:' + name);
  };
  const uniform = (name) => {
    if (!locations.has('u:' + name)) locations.set('u:' + name, gl.getUniformLocation(handle, name));
    return locations.get('u:' + name);
  };

  return {
    handle,
    use: () => gl.useProgram(handle),
    attribute,
    set1f: (name, value) => gl.uniform1f(uniform(name), value),
    set2f: (name, x, y) => gl.uniform2f(uniform(name), x, y),
    set3f: (name, color) => gl.uniform3f(uniform(name), color[0], color[1], color[2]),
    dispose: () => gl.deleteProgram(handle)
  };
}

export function createBuffer(gl, data, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
  return buffer;
}

export function resetAttributes(gl) {
  for (let index = 0; index < 16; index += 1) gl.disableVertexAttribArray(index);
}

export function bindAttribute(gl, program, name, size, stride, offset) {
  const location = program.attribute(name);
  if (location === undefined || location === null || location < 0) return;
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
}

export function createTicker(step, minInterval) {
  let frameId = 0;
  let previous = 0;
  let lastStep = 0;
  const frame = (now) => {
    frameId = window.requestAnimationFrame(frame);
    if (minInterval && now - lastStep < minInterval * 1000) {
      previous = now;
      return;
    }
    const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0.016;
    previous = now;
    lastStep = now;
    step(delta, now);
  };
  return {
    start() {
      if (frameId) return;
      previous = 0;
      lastStep = 0;
      frameId = window.requestAnimationFrame(frame);
    },
    stop() {
      if (!frameId) return;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
  };
}

export function createViewportGate(element, onChange, rootMargin) {
  let intersecting = false;
  let pageVisible = document.visibilityState !== 'hidden';
  let observer = null;

  const evaluate = () => onChange(intersecting && pageVisible);

  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        intersecting = entries[entries.length - 1].isIntersecting;
        evaluate();
      },
      { rootMargin: rootMargin || '160px' }
    );
    observer.observe(element);
  } else {
    intersecting = true;
  }

  const onVisibility = () => {
    pageVisible = document.visibilityState !== 'hidden';
    evaluate();
  };
  document.addEventListener('visibilitychange', onVisibility);
  evaluate();

  return {
    destroy() {
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}

export function bindContextLoss(canvas, gl, onLost) {
  const handleLost = (event) => {
    event.preventDefault();
    onLost();
  };
  const handleRestored = () => onLost();
  canvas.addEventListener('webglcontextlost', handleLost, false);
  canvas.addEventListener('webglcontextrestored', handleRestored, false);
  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost, false);
    canvas.removeEventListener('webglcontextrestored', handleRestored, false);
  };
}
