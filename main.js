const { app, BrowserWindow, Tray, Menu, ipcMain, protocol } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const WindowStateManager = require('./window-state');
const url = require('url');

// Register custom protocol before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

// Load environment variables
const getEnvPath = () => {
  const paths = [
    path.join(process.resourcesPath, 'app/frontend/.env'),
    path.join(__dirname, 'frontend', '.env')
  ];
  return paths.find(p => fs.existsSync(p));
};

const envPath = getEnvPath();
if (envPath) {
  console.log('Loading environment from:', envPath);
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
} else {
  console.error('No .env file found');
}

// Set up protocol handler for serving local files
app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      // Remove the app:// prefix and leading slashes
      let filePath = request.url.replace(/^app:\/\/\.?\/?/, '');
      
      // Handle static media files
      if (filePath.includes('static/media')) {
        filePath = path.join(__dirname, 'frontend', 'build', filePath);
      } else {
        filePath = path.join(__dirname, 'frontend', 'build', filePath);
      }
      
      console.log('Protocol handler - Requested:', request.url);
      console.log('Resolved to:', filePath);
      console.log('File exists:', fs.existsSync(filePath));
      
      if (fs.existsSync(filePath)) {
        return callback(filePath);
      } else {
        console.error('File not found:', filePath);
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    } catch (error) {
      console.error('Protocol handler error:', error);
      callback({ error: -2 }); // FAILED
    }
  });
});

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
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      allowRunningInsecureContent: false,
      // Allow loading local resources
      webviewTag: true
    },
    icon: path.join(process.env.NODE_ENV === 'development' 
      ? path.join(__dirname, 'build', 'icon.png')
      : path.join(process.resourcesPath, 'app', 'public', 'logo500.png')
    ),
    show: false // Don't show until ready-to-show
  });

  // Handle certificate errors in development
  mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
    // Accept all certificates in development
    callback(0); // 0 = OK, -3 = Denied
  });

  if (windowState.state.isMaximized) {
    mainWindow.maximize();
  }

  // Track window state changes
  windowState.track(mainWindow);

  // In production, load from the build files using our custom protocol
  const indexPath = path.join(__dirname, 'frontend', 'build', 'index.html');
  console.log('Current directory:', __dirname);
  console.log('Looking for index at:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));

  // Debug: List contents of build directory
  const buildPath = path.join(__dirname, 'frontend', 'build');
  if (fs.existsSync(buildPath)) {
    console.log('Build directory contents:', fs.readdirSync(buildPath));
  } else {
    console.log('Build directory not found:', buildPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.openDevTools();
  });

  // Log navigation events
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('Started loading...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Failed to load:', errorCode, errorDescription);
  });

  // Load the app
  try {
    // In development, load from localhost
    if (process.env.NODE_ENV === 'development') {
      console.log('Loading from development server...');
      mainWindow.loadURL('https://localhost:3000').catch(err => {
        console.error('Failed to load from dev server:', err);
      });
    } else {
      // In production, load from build files
      console.log('Loading from production build...');
      const startPath = path.resolve(indexPath);
      console.log('Resolved path:', startPath);
      mainWindow.loadURL(`app://${startPath}`).catch(err => {
        console.error('Failed to load with app protocol:', err);
        // Fallback to file protocol
        mainWindow.loadFile(startPath).catch(err2 => {
          console.error('Failed to load with file protocol:', err2);
        });
      });
    }
  } catch (err) {
    console.error('Error during window load:', err);
  }
}

// Main initialization
app.whenReady().then(() => {
  // Set up protocol handler logging
  const logAssetAccess = (request, resolvedPath) => {
    console.log('\n[Asset Access Request]');
    console.log('Requested URL:', request.url);
    console.log('Resolved Path:', resolvedPath);
    console.log('File exists:', fs.existsSync(resolvedPath));
    console.log('Base directory:', __dirname);
    
    // List contents of media directory
    const mediaPath = path.join(__dirname, 'frontend', 'build', 'static', 'media');
    console.log('\nMedia directory contents:');
    if (fs.existsSync(mediaPath)) {
      console.log(fs.readdirSync(mediaPath));
    } else {
      console.log('Media directory not found at:', mediaPath);
    }
    console.log('-------------------\n');
  };

  // Register protocol handler for local file access
  protocol.registerFileProtocol('app', (request, callback) => {
    try {
      // Remove app:// prefix and clean up path
      let requestedPath = request.url.replace(/^app:\/+/, '');
      requestedPath = decodeURIComponent(requestedPath);
      
      // For media files, use the build directory
      if (requestedPath.includes('static/media')) {
        const resolvedPath = path.join(__dirname, 'frontend', 'build', requestedPath);
        logAssetAccess(request, resolvedPath);
        
        if (fs.existsSync(resolvedPath)) {
          return callback({
            path: resolvedPath,
            headers: {
              'Content-Type': 'application/octet-stream',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
      // For other files, try multiple locations
      const basePaths = [
        path.join(__dirname, 'frontend', 'build'),
        path.join(__dirname, 'frontend'),
        __dirname
      ];
      
      for (const basePath of basePaths) {
        const resolvedPath = path.join(basePath, requestedPath);
        logAssetAccess(request, resolvedPath);
        
        if (fs.existsSync(resolvedPath)) {
          return callback({
            path: resolvedPath,
            headers: {
              'Content-Type': 'application/octet-stream',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
      console.error('File not found:', requestedPath);
      callback({ error: -6 }); // FILE_NOT_FOUND
    } catch (err) {
      console.error('Protocol handler error:', err);
      callback({ error: -2 }); // FAILED
    }
  });

  // Set up IPC channels
  setupIPC();
  
  // Create window and tray
  createWindow();
  createTray();
});

// Handle window close events
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle reactivation (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});