const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Get build directory path
const buildDir = path.join(__dirname, 'frontend', 'build');

// Get environment variables from the main process
const envVars = {
  // OAuth Configuration
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  
  // Frontend Configuration
  REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
  FRONTEND_REDIRECT_URL: process.env.FRONTEND_REDIRECT_URL,
  REACT_APP_USE_GROUP_LOGO: process.env.REACT_APP_USE_GROUP_LOGO,
  
  // Environment Configuration
  NODE_ENV: process.env.NODE_ENV || 'production',
  PUBLIC_URL: process.env.PUBLIC_URL || '.',
  
  // Build paths for asset loading
  BUILD_DIR: buildDir,
  
  // Resource paths
  RESOURCES_PATH: process.resourcesPath || __dirname
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Environment variables (only expose what's needed)
    env: envVars,
    // Flag to indicate we're running in Electron
    isElectron: true,
    // Email functionality
    sendEmail: (data) => {
      return new Promise((resolve) => {
        ipcRenderer.send('send-email', data);
        ipcRenderer.once('email-sent', (_, result) => {
          resolve(result);
        });
      });
    },

    // Phishing detection
    checkPhishing: (data) => {
      return new Promise((resolve) => {
        ipcRenderer.send('check-phishing', data);
        ipcRenderer.once('phishing-result', (_, result) => {
          resolve(result);
        });
      });
    },

    // Window management
    windowControls: {
      minimize: () => ipcRenderer.send('minimize-to-tray'),
      maximize: () => ipcRenderer.send('maximize-window'),
      close: () => ipcRenderer.send('close-window'),
    },

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  }
);