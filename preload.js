const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
const envPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.keys(envConfig).forEach(key => {
    process.env[key] = envConfig[key];
  });
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Environment variables (only expose what's needed)
    env: {
      REACT_APP_GMAIL_CLIENT_ID: process.env.REACT_APP_GMAIL_CLIENT_ID,
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
      REACT_APP_FRONTEND_URL: process.env.REACT_APP_FRONTEND_URL
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