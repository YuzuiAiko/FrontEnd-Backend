const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const WindowStateManager = require('./window-state');

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

  // Add a delay before loading the URL to give the servers some time to start
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5002');
  }, 5000); // 5 seconds delay
}

app.whenReady().then(() => {
  // Start backend services
  exec('cd backend/classifier && py svm_model.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting classifier: ${error.message}`);
      return;
    }
    console.log(`Classifier stdout: ${stdout}`);
    console.error(`Classifier stderr: ${stderr}`);
  });

  exec('cd backend && node server.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting backend server: ${error.message}`);
      return;
    }
    console.log(`Backend server stdout: ${stdout}`);
    console.error(`Backend server stderr: ${stderr}`);
  });

  exec('cd frontend && npm start', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting frontend: ${error.message}`);
      return;
    }
    console.log(`Frontend stdout: ${stdout}`);
    console.error(`Frontend stderr: ${stderr}`);
  });

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