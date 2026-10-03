import { getCapabilities } from './capabilities.js';
import { createHeroField } from './hero-field.js';
import { createSkillsConstellation } from './skills-constellation.js';
import { applyLiquidGlass } from './liquid-glass.js';

function boot() {
  const caps = getCapabilities();
  const root = document.documentElement;
  const instances = [];
  const heroHost = document.getElementById('heroField');
  const skillsHost = document.getElementById('skillsField');
  const skillsGrid = document.getElementById('skillsGrid');
  let hero = null;
  let skills = null;
  let webglCount = 0;

  if (caps.webgl) {
    if (heroHost) {
      hero = createHeroField(heroHost);
      if (hero) {
        instances.push(hero);
        webglCount += 1;
      }
    }
    if (skillsHost && skillsGrid) {
      skills = createSkillsConstellation(skillsHost, skillsGrid);
      if (skills) {
        instances.push(skills);
        webglCount += 1;
      }
    }
  }

  const glass = applyLiquidGlass(document);
  if (glass.count) instances.push(glass);

  root.setAttribute('data-fx', webglCount > 0 ? 'on' : 'off');
  root.setAttribute('data-fx-tier', caps.tier);
  root.setAttribute('data-fx-booted', 'true');

  const stats = () => ({
    tier: caps.tier,
    webgl: webglCount,
    heroReady: Boolean(heroHost && heroHost.classList.contains('fx-ready')),
    heroStatic: Boolean(heroHost && heroHost.classList.contains('fx-static')),
    skillsReady: Boolean(skillsHost && skillsHost.classList.contains('fx-ready')),
    glass: glass.count,
    nodes: skills ? skills.stats.nodes : 0,
    edges: skills ? skills.stats.edges : 0
  });

  const teardown = () => {
    while (instances.length) {
      const instance = instances.pop();
      try {
        instance.destroy();
      } catch (error) {
        void error;
      }
    }
  };

  window.addEventListener('pagehide', teardown, { once: true });

  return { webgl: webglCount, stats, teardown, capabilities: caps };
}

const api = boot();

if (typeof window !== 'undefined') {
  window.__portfolioFx = {
    get webgl() {
      return api.webgl;
    },
    get stats() {
      return api.stats();
    },
    get capabilities() {
      return {
        webgl: api.capabilities.webgl,
        tier: api.capabilities.tier,
        software: api.capabilities.software,
        renderer: api.capabilities.renderer,
        reducedMotion: api.capabilities.reducedMotion,
        finePointer: api.capabilities.finePointer,
        budget: api.capabilities.budget
      };
    },
    teardown: api.teardown
  };
}
