const electron = require('electron');
const path = require('path');
const fs = require('fs');

class WindowStateManager {
  constructor(options) {
    this.path = path.join(
      (electron.app || electron.remote.app).getPath('userData'),
      'window-state.json'
    );
    this.defaults = {
      width: options.defaultWidth || 800,
      height: options.defaultHeight || 600,
      x: undefined,
      y: undefined,
      isMaximized: false
    };
    this.loadState();
  }

  loadState() {
    try {
      this.state = JSON.parse(fs.readFileSync(this.path, 'utf8'));
    } catch (err) {
      this.state = this.defaults;
    }
  }

  saveState(win) {
    if (!win.isDestroyed()) {
      const bounds = win.getBounds();
      this.state = {
        ...this.state,
        ...bounds,
        isMaximized: win.isMaximized()
      };
    }
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.state));
    } catch (err) {
      console.error('Failed to save window state', err);
    }
  }

  track(win) {
    win.on('resize', () => this.saveState(win));
    win.on('move', () => this.saveState(win));
    win.on('close', () => this.saveState(win));
  }
}

module.exports = WindowStateManager;