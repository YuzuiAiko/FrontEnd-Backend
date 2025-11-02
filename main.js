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
const envPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

// Set up protocol handler for serving local files
app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const filePath = url.fileURLToPath(
      'file://' + path.join(__dirname, 'frontend/build', request.url.slice('app://./'.length))
    );
    callback(filePath);
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
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
  // Set up logging
const logRequest = (prefix, request, filePath) => {
  console.log(`${prefix}:
    URL: ${request.url}
    Resolved Path: ${filePath}
    Exists: ${fs.existsSync(filePath)}
    Directory: ${__dirname}
    Working Dir: ${process.cwd()}
  `);
};

// Register protocol handler
protocol.registerFileProtocol('app', (request, callback) => {
  try {
    let filePath = request.url.slice('app://'.length);
    
    // Handle Windows paths
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\//, '');
    }
    
    // Remove any query parameters
    filePath = filePath.split('?')[0];
    
    // Handle special characters
    filePath = decodeURIComponent(filePath);
    
    // For image files, try multiple base paths
    if (filePath.match(/\.(png|jpg|jpeg|gif)$/i)) {
      const possiblePaths = [
        filePath,
        path.join(__dirname, filePath),
        path.join(__dirname, 'frontend', filePath),
        path.join(__dirname, 'frontend', 'build', filePath),
        path.join(__dirname, 'frontend', 'src', filePath)
      ];
      
      for (const tryPath of possiblePaths) {
        logRequest('Trying image path', request, tryPath);
        if (fs.existsSync(tryPath)) {
          console.log('Found image at:', tryPath);
          return callback(tryPath);
        }
      }
      
      console.error('Image not found in any location:', filePath);
      return callback({ error: -6 });
    }
    
    // For non-image files
    logRequest('Processing request', request, filePath);
    
    if (fs.existsSync(filePath)) {
      callback(filePath);
    } else {
      console.error('File not found:', filePath);
      callback({ error: -6 /* FILE NOT FOUND */ });
    }
  } catch (err) {
    console.error('Protocol handler error:', err);
    callback({ error: -2 /* FAILED */ });
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