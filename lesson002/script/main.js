import WebGLApp  from './webgl.js';
import { registerAnimation } from './dom-animation.js';

window.addEventListener(
  'DOMContentLoaded',
  async () => {
    // DOM
    registerAnimation();

    // Webgl
    const app = new WebGLApp();
    app.setupPane();
    app.init('webgl-plane', 'webgl-canvas', { alpha: true });
    await app.load();
    await app.setup();
    app.addEventListeners();
    app.render();
  },
  false
);
