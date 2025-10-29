const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const WindowStateManager = require('./window-state');

// Load environment variables
const envPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

let tray = null;
let mainWindow = null;
let windowState = null;

// Set up IPC channels
function setupIPC() {
  // Email handling
  ipcMain.on('send-email', async (event, data) => {
    // Handle email sending
    event.reply('email-sent', { success: true });
  });

  // Phishing detection
  ipcMain.on('check-phishing', async (event, data) => {
    // Forward to Python service
    event.reply('phishing-result', { result: true });
  });

  // App management
  ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => mainWindow.show() 
    },
    { 
      label: 'Minimize to Tray', 
      click: () => mainWindow.hide() 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuiting = true;
        app.quit();
      } 
    }
  ]);
  tray.setToolTip('Sifri Mail');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.show();
  });
}

function createWindow() {
  // Initialize window state manager
  windowState = new WindowStateManager({
    defaultWidth: 1200,
    defaultHeight: 800
  });

  mainWindow = new BrowserWindow({
    x: windowState.state.x,
    y: windowState.state.y,
    width: windowState.state.width,
    height: windowState.state.height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false // Don't show until ready-to-show
  });

  if (windowState.state.isMaximized) {
    mainWindow.maximize();
  }

  // Track window state changes
  windowState.track(mainWindow);

  // In production, load from the build files
  const indexPath = path.join(__dirname, 'frontend', 'build', 'index.html');
  console.log('Loading index from:', indexPath);
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('Failed to load index.html:', err);
  });

  // Show window when ready and open dev tools in case of issues
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Uncomment the next line to debug loading issues
    mainWindow.webContents.openDevTools();
  });
}

app.whenReady().then(() => {
  // Set up IPC channels
  setupIPC();

  createWindow();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});