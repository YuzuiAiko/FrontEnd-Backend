const { contextBridge, ipcRenderer } = require('electron');

// Debug: Log available environment variables
console.log('Environment variables in preload:', 
  Object.keys(process.env)
    .filter(key => !key.includes('SECRET') && !key.includes('PASSWORD'))
    .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {})
);

// Helper functions for path handling
const normalizePath = (path) => path ? path.replace(/\\/g, '/').replace(/\/+/g, '/') : '';
const joinPaths = (...parts) => normalizePath(parts.filter(Boolean).join('/'));

// Get application paths safely
const getAppPath = () => {
    if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
    if (process.env.APPDATA) return process.env.APPDATA;
    return process.cwd();
};

const getResourcesPath = () => {
    // In development
    if (process.env.NODE_ENV === 'development') return process.cwd();
    // In production, use the app.asar path
    const resourcesPath = process.resourcesPath;
    if (!resourcesPath) return joinPaths(getAppPath(), 'resources');
    
    // Check if we're in the app.asar
    if (resourcesPath.includes('app.asar')) {
        return resourcesPath.split('app.asar')[0];
    }
    return resourcesPath;
};

// Get environment variables from the main process
const envVars = {
  // OAuth Configuration
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID || '',
  
  // Frontend Configuration
  REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL || 'https://localhost:5002',
  FRONTEND_REDIRECT_URL: process.env.FRONTEND_REDIRECT_URL || 'http://localhost:5003',
  REACT_APP_USE_GROUP_LOGO: process.env.REACT_APP_USE_GROUP_LOGO || 'true',
  
  // Environment Configuration
  NODE_ENV: process.env.NODE_ENV || 'production',
  PUBLIC_URL: process.env.PUBLIC_URL || '.',
  
  // Resource paths
  APP_PATH: normalizePath(getAppPath()),
  RESOURCES_PATH: normalizePath(getResourcesPath()),
  
  // Debug info
  ENV_LOADED: JSON.stringify({
    hasGmailId: !!process.env.GMAIL_CLIENT_ID,
    envKeys: Object.keys(process.env),
    appPath: getAppPath(),
    resourcesPath: getResourcesPath(),
    isDev: process.env.NODE_ENV === 'development'
  })
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Environment variables (only expose what's needed)
    env: envVars,
    // Flag to indicate we're running in Electron
    isElectron: true,
    // Path utilities
    utils: {
      normalizePath: normalizePath,
      joinPaths: joinPaths,
      resolvePath: (...parts) => joinPaths(envVars.APP_PATH, ...parts),
      resolveResourcePath: (...parts) => joinPaths(envVars.RESOURCES_PATH, ...parts)
    },
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