const { contextBridge, ipcRenderer } = require('electron');

// Get environment variables from the main process
const envVars = {
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
  FRONTEND_REDIRECT_URL: process.env.FRONTEND_REDIRECT_URL
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Environment variables (only expose what's needed)
    env: {
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
      FRONTEND_REDIRECT_URL: process.env.FRONTEND_REDIRECT_URL
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